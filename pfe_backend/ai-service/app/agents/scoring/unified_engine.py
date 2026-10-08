"""Single compatibility engine, used identically by the matching pipeline and
the recommendation pipeline (§1/§2 of the plan). Orchestrates the 6
rule-based scorers plus the semantic engine and aggregates them into one
`UnifiedScore` via `compute_weighted_score` — a flat weighted average over the
7 criteria, with missing criteria excluded and weights renormalized rather
than defaulted to a neutral/punitive value.
"""
from __future__ import annotations

from dataclasses import dataclass, field

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.certifications import score_certifications
from app.agents.matching.rule_based.education import score_education
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy, load_esco_taxonomy
from app.agents.matching.rule_based.experience import score_experience
from app.agents.matching.rule_based.languages import score_languages
from app.agents.matching.rule_based.projects import score_projects
from app.agents.matching.rule_based.skills import CriterionResult, score_skills
from app.agents.matching.semantic.embedding_provider import SectionEmbeddingProvider
from app.agents.matching.semantic.engine import SemanticScore, compute_semantic_score
from app.agents.matching.semantic.qdrant_store import SectionVectorStore
from app.agents.scoring.aggregate import compute_weighted_score
from app.config.settings import Settings
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from app.schemas.scoring import UnifiedBreakdownSchema


@dataclass(slots=True)
class UnifiedScore:
    overall: float | None  # 0-1, or None when no criterion was available
    breakdown: UnifiedBreakdownSchema
    unavailable_criteria: list[str]
    per_criterion: dict[str, CriterionResult] = field(default_factory=dict)
    semantic_score: SemanticScore | None = None
    matched_skills: list[str] = field(default_factory=list)
    missing_skills: list[str] = field(default_factory=list)


def compute_unified_score(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    settings: Settings,
    normalizer: NormalizationAgent | None = None,
    esco: EscoTaxonomy | None = None,
    embedding_provider: SectionEmbeddingProvider | None = None,
    section_store: SectionVectorStore | None = None,
    db_mappings: dict[str, str] | None = None,
    candidate_cv_vectors: dict[str, list[float] | None] | None = None,
    job_offer_vectors: dict[str, list[float] | None] | None = None,
) -> UnifiedScore:
    normalizer = normalizer or NormalizationAgent(settings)
    esco = esco or load_esco_taxonomy(settings)
    threshold = settings.matching_fuzzy_threshold

    skills = score_skills(candidate, job_offer, esco, normalizer, db_mappings, threshold)
    experience = score_experience(candidate, job_offer)
    education = score_education(candidate, job_offer, normalizer, threshold)
    projects = score_projects(candidate, job_offer, esco, normalizer, db_mappings, threshold)
    languages = score_languages(candidate, job_offer, normalizer)
    certifications = score_certifications(candidate, job_offer, threshold)

    semantic_score: SemanticScore | None = None
    semantic_value: float | None = None
    if embedding_provider is not None:
        semantic_score = compute_semantic_score(
            candidate, job_offer, embedding_provider, section_store, settings,
            cv_vectors=candidate_cv_vectors, job_vectors=job_offer_vectors,
        )
        # An unavailable semantic engine (model not loaded, or a real
        # encoding failure) must not contribute a fabricated value — its
        # `aggregate` is already None in the encoding-failure case, but the
        # "model not loaded" case can still carry a computed aggregate over
        # whatever text was embeddable, which must not be counted as real
        # signal either.
        semantic_value = semantic_score.aggregate if semantic_score.available else None

    per_criterion = {
        "skills": skills,
        "experience": experience,
        "education": education,
        "projects": projects,
        "languages": languages,
        "certifications": certifications,
    }

    scores: dict[str, float | None] = {
        "skills": skills.score,
        "experience": experience.score,
        "semantic": semantic_value,
        "education": education.score,
        "projects": projects.score,
        "languages": languages.score,
        "certifications": certifications.score,
    }

    weights = {
        "skills": settings.unified_skills_weight,
        "experience": settings.unified_experience_weight,
        "semantic": settings.unified_semantic_weight,
        "education": settings.unified_education_weight,
        "projects": settings.unified_projects_weight,
        "languages": settings.unified_languages_weight,
        "certifications": settings.unified_certifications_weight,
    }

    overall, unavailable = compute_weighted_score(scores, weights)

    breakdown = UnifiedBreakdownSchema(
        skills=scores["skills"],
        experience=scores["experience"],
        semantic=scores["semantic"],
        education=scores["education"],
        projects=scores["projects"],
        languages=scores["languages"],
        certifications=scores["certifications"],
    )

    return UnifiedScore(
        overall=overall,
        breakdown=breakdown,
        unavailable_criteria=unavailable,
        per_criterion=per_criterion,
        semantic_score=semantic_score,
        matched_skills=skills.matched,
        missing_skills=skills.missing,
    )
