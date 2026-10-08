from __future__ import annotations

from dataclasses import dataclass, field

from app.agents.matching.semantic.embedding_provider import SectionEmbeddingProvider
from app.agents.matching.semantic.qdrant_store import (
    CV_SECTIONS_COLLECTION,
    JOB_SECTIONS_COLLECTION,
    SectionVectorStore,
)
from app.agents.scoring.aggregate import compute_weighted_score
from app.config.settings import Settings
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from app.utils.math import cosine_similarity


@dataclass(slots=True)
class SemanticScore:
    aggregate: float | None  # 0-1, or None when no section could be scored
    per_section: dict[str, float | None] = field(default_factory=dict)
    # False when the embedding model itself isn't loaded, or when a real
    # encoding failure occurred on non-empty text — callers must not blend
    # `aggregate` into the final score in that case, since it would either be
    # None already or based on partial/unreliable per-section data.
    available: bool = True
    # Exposed so callers (persistence) can reuse these instead of running a
    # separate whole-profile embedding pass just to have "a vector to store".
    cv_vectors: dict[str, list[float]] = field(default_factory=dict)
    job_vectors: dict[str, list[float]] = field(default_factory=dict)


def _cv_sections(candidate: CandidateProfileSchema) -> dict[str, str]:
    return {
        "summary": candidate.summary,
        "skills": " ".join(candidate.skillsRaw),
        "experience": " ".join(f"{exp.title} {exp.company} {exp.description}" for exp in candidate.experiences),
    }


def _job_sections(job_offer: JobOfferSchema) -> dict[str, str]:
    return {
        "summary": " ".join([job_offer.title, *job_offer.missions]),
        "skills": " ".join(job_offer.requiredSkillsRaw + job_offer.niceToHaveSkillsRaw),
        "experience": f"{job_offer.requiredExperienceYears} years - {job_offer.title}",
    }


def compute_semantic_score(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    provider: SectionEmbeddingProvider,
    store: SectionVectorStore | None,
    settings: Settings,
    cv_vectors: dict[str, list[float] | None] | None = None,
    job_vectors: dict[str, list[float] | None] | None = None,
) -> SemanticScore:
    cv_sections = _cv_sections(candidate)
    job_sections = _job_sections(job_offer)
    # When scoring one side against many of the other (recommendation mode:
    # one candidate vs many jobs, or one job vs many candidates), the caller
    # pre-computes the fixed side's section vectors once and passes them in
    # here instead of re-encoding the same text on every iteration —
    # encoding is the dominant cost of a fine-scoring pass.
    if cv_vectors is None:
        cv_vectors = provider.encode_sections(cv_sections)
    if job_vectors is None:
        job_vectors = provider.encode_sections(job_sections)

    if store and candidate.id:
        store.upsert(CV_SECTIONS_COLLECTION, candidate.id, {k: v for k, v in cv_vectors.items() if v})
    if store and job_offer.id:
        store.upsert(JOB_SECTIONS_COLLECTION, job_offer.id, {k: v for k, v in job_vectors.items() if v})

    section_weights = {
        "summary": settings.matching_semantic_summary_weight,
        "skills": settings.matching_semantic_skills_weight,
        "experience": settings.matching_semantic_experience_weight,
    }

    per_section: dict[str, float | None] = {}
    encoding_failed = False
    for section in section_weights:
        cv_vec = cv_vectors.get(section)
        job_vec = job_vectors.get(section)
        if not cv_vec or not job_vec:
            # A missing vector is only a real encoding failure when there was
            # actual text on that side to embed — if the text was empty, the
            # missing vector is expected, not a fault. Checked per side: a
            # section with real text on one side and nothing on the other is
            # just "nothing to compare" (per_section -> None), not a failure.
            cv_failed = not cv_vec and cv_sections.get(section, "").strip()
            job_failed = not job_vec and job_sections.get(section, "").strip()
            per_section[section] = None
            if cv_failed or job_failed:
                # A real encoding failure invalidates the whole semantic
                # criterion (`available=False`), not just this section.
                encoding_failed = True
            continue
        raw_sim = cosine_similarity(cv_vec, job_vec)
        per_section[section] = (raw_sim + 1) / 2  # normalize [-1, 1] -> [0, 1]

    aggregate, _unavailable_sections = compute_weighted_score(per_section, section_weights)
    if encoding_failed:
        aggregate = None
    return SemanticScore(
        aggregate=aggregate,
        per_section=per_section,
        available=provider.available and not encoding_failed,
        cv_vectors={k: v for k, v in cv_vectors.items() if v},
        job_vectors={k: v for k, v in job_vectors.items() if v},
    )
