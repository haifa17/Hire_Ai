from __future__ import annotations

from rapidfuzz import fuzz, process

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.skills import CriterionResult
from app.agents.scoring.overqualification import overqualification_penalty
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


def score_education(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    normalizer: NormalizationAgent,
    fuzzy_threshold: int = 85,
) -> CriterionResult:
    required_level = job_offer.educationLevel or ""
    required_rank = normalizer.education_rank(required_level) if required_level else 0
    candidate_best_rank = 0
    candidate_best_field = ""
    for item in candidate.education:
        rank = normalizer.education_rank(item.degree or "")
        if rank > candidate_best_rank:
            candidate_best_rank = rank
            candidate_best_field = item.degree or ""

    if not required_level or required_rank <= 0:
        # No education requirement stated on the offer: always shown as a
        # real score in the UI rather than "not evaluated".
        return CriterionResult(score=1.0, details={"reason": "no_education_requirement"})

    if candidate_best_rank <= 0:
        # Candidate has no extracted education against a job that does
        # require one: real low score, not "not evaluated".
        return CriterionResult(score=0.45, details={"reason": "candidate_education_unavailable"})

    level_score = 1.0 if candidate_best_rank >= required_rank else candidate_best_rank / required_rank
    level_score = overqualification_penalty(candidate_best_rank, required_rank, level_score)

    # field match: fuzzy token comparison between degree field and any job requirement text
    field_score = 1.0
    job_field_hint = " ".join([job_offer.title, *job_offer.missions]).strip()
    if candidate_best_field and job_field_hint:
        similarity = fuzz.token_set_ratio(candidate_best_field, job_field_hint)
        field_score = 1.0 if similarity >= fuzzy_threshold else similarity / 100

    score = 0.7 * level_score + 0.3 * field_score
    return CriterionResult(
        score=score,
        details={
            "requiredRank": required_rank,
            "candidateRank": candidate_best_rank,
            "levelScore": level_score,
            "fieldScore": field_score,
        },
    )
