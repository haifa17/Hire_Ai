from __future__ import annotations

from rapidfuzz import fuzz, process

from app.agents.matching.rule_based.skills import CriterionResult
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


def score_certifications(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    fuzzy_threshold: int = 85,
) -> CriterionResult:
    required = [c for c in job_offer.requiredCertifications if c]
    if not required:
        return CriterionResult(score=None, details={"reason": "no_certification_requirement"})

    candidate_certs = [c for c in candidate.certifications if c]
    if not candidate_certs:
        return CriterionResult(score=0.0, missing=required)

    matched: list[str] = []
    missing: list[str] = []
    for req in required:
        best = process.extractOne(req, candidate_certs, scorer=fuzz.token_sort_ratio, score_cutoff=fuzzy_threshold)
        (matched if best else missing).append(req)

    return CriterionResult(score=len(matched) / len(required), matched=matched, missing=missing)
