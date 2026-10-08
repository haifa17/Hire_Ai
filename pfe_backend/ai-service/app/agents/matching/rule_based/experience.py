from __future__ import annotations

from app.agents.matching.rule_based.skills import CriterionResult
from app.agents.scoring.overqualification import overqualification_penalty
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


def score_experience(candidate: CandidateProfileSchema, job_offer: JobOfferSchema) -> CriterionResult:
    required_years = job_offer.requiredExperienceYears or 0.0
    candidate_years = candidate.totalExperienceYears or 0.0

    if required_years <= 0:
        # No experience requirement stated on the offer: always shown as a
        # real score in the UI rather than "not evaluated".
        return CriterionResult(score=1.0, details={"reason": "no_experience_requirement"})

    ratio = candidate_years / required_years
    base_score = min(ratio, 1.0)
    score = overqualification_penalty(candidate_years, required_years, base_score)
    return CriterionResult(
        score=score,
        details={"candidateYears": candidate_years, "requiredYears": required_years, "ratio": ratio},
    )
