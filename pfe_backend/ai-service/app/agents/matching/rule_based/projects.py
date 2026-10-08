from __future__ import annotations

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy
from app.agents.matching.rule_based.normalize import fuzzy_overlap
from app.agents.matching.rule_based.skills import CriterionResult
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema


def score_projects(
    candidate: CandidateProfileSchema,
    job_offer: JobOfferSchema,
    esco: EscoTaxonomy,
    normalizer: NormalizationAgent,
    db_mappings: dict[str, str] | None = None,
    fuzzy_threshold: int = 85,
) -> CriterionResult:
    """Technology overlap between the candidate's project/experience history
    and the job's required tech stack. Uses `experience.skillsUsed` as the
    schema doesn't have a dedicated "projects" section."""
    tech_stack = [s for s in (job_offer.requiredSkillsRaw + job_offer.niceToHaveSkillsRaw) if s]
    if not tech_stack:
        return CriterionResult(score=None, details={"reason": "no_tech_stack_requirement"})

    project_tech: list[str] = []
    for exp in candidate.experiences:
        project_tech.extend(exp.skillsUsed or [])

    if not project_tech:
        # No `skillsUsed` extracted for any experience is an extraction gap,
        # not proof the candidate has zero relevant project tech — treat as
        # unavailable rather than a punitive real zero (see plan §4).
        return CriterionResult(score=None, missing=tech_stack, details={"reason": "no_project_tech_found"})

    matched, missing = fuzzy_overlap(project_tech, tech_stack, esco, normalizer, db_mappings, fuzzy_threshold)
    score = len(matched) / len(tech_stack)
    return CriterionResult(score=score, matched=matched, missing=missing)
