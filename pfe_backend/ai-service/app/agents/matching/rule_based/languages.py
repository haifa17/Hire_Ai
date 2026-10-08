from __future__ import annotations

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.skills import CriterionResult
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


def score_languages(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    normalizer: NormalizationAgent,
) -> CriterionResult:
    required = [str(lang) for lang in job_offer.languages if lang]
    if not required:
        return CriterionResult(score=None, details={"reason": "no_language_requirement"})

    candidate_values = {normalizer.canonical_skill(lang.language) for lang in candidate.languages if lang.language}
    required_values = {normalizer.canonical_skill(lang) for lang in required}
    required_values.discard("")
    if not required_values:
        return CriterionResult(score=None, details={"reason": "no_language_requirement"})

    matched = sorted(candidate_values & required_values)
    missing = sorted(required_values - candidate_values)
    return CriterionResult(score=len(matched) / len(required_values), matched=matched, missing=missing)
