from __future__ import annotations

from dataclasses import dataclass, field

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy
from app.agents.matching.rule_based.normalize import fuzzy_overlap
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


@dataclass(slots=True)
class CriterionResult:
    score: float | None  # 0-1, or None when the criterion couldn't be evaluated
    matched: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)
    details: dict = field(default_factory=dict)


def score_skills(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    esco: EscoTaxonomy,
    normalizer: NormalizationAgent,
    db_mappings: dict[str, str] | None = None,
    fuzzy_threshold: int = 85,
) -> CriterionResult:
    required = [s for s in job_offer.requiredSkillsRaw if s]
    if not required:
        return CriterionResult(score=None, details={"reason": "no_required_skills"})

    candidate_skills = [s for s in candidate.skillsRaw if s]
    matched, missing = fuzzy_overlap(candidate_skills, required, esco, normalizer, db_mappings, fuzzy_threshold)

    # nice-to-have skills contribute a small bonus but never exceed 1.0
    preferred = [s for s in job_offer.niceToHaveSkillsRaw if s]
    preferred_matched, _ = fuzzy_overlap(candidate_skills, preferred, esco, normalizer, db_mappings, fuzzy_threshold) if preferred else ([], [])

    base = len(matched) / len(required)
    bonus = 0.1 * (len(preferred_matched) / len(preferred)) if preferred else 0.0
    return CriterionResult(
        score=min(1.0, base + bonus),
        matched=matched,
        missing=missing,
        details={"requiredCount": len(required), "matchedCount": len(matched), "preferredMatched": preferred_matched},
    )
