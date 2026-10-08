"""Adapter reconstructing the rich `CandidateProfileSchema`/`JobOfferSchema`
(used by the unified scoring engine) from the Qdrant payloads produced at
recommendation-indexing time, and vice versa.

During the transition window before a full re-index, older Qdrant payloads
won't carry the new structured snapshot fields (`experiences_snapshot`,
`education_snapshot`, `required_certifications`, ...) — every accessor here
degrades gracefully to an empty/default value rather than raising, so the
corresponding rule-based criteria simply come back `None` (unavailable)
instead of crashing the recommendation pipeline.
"""
from __future__ import annotations

from typing import Any

from app.schemas.matching import (
    CandidateProfileSchema,
    EducationSchema,
    ExperienceSchema,
    IdentitySchema,
    JobOfferSchema,
    LanguageSchema,
)
from app.schemas.recommendation import CandidateFeatures, JobFeatures


def candidate_profile_from_payload(candidate_id: str, payload: dict[str, Any]) -> CandidateProfileSchema:
    """Reconstruct a `CandidateProfileSchema` from a candidate's Qdrant payload."""
    experiences_raw = payload.get("experiences_snapshot") or []
    experiences = [
        ExperienceSchema(
            title=str(item.get("title", "") or ""),
            company=str(item.get("company", "") or ""),
            startDate=str(item.get("startDate", "") or ""),
            endDate=str(item.get("endDate", "") or ""),
            description=str(item.get("description", "") or ""),
            skillsUsed=[str(s) for s in (item.get("skillsUsed") or []) if s],
        )
        for item in experiences_raw
        if isinstance(item, dict)
    ]

    education_raw = payload.get("education_snapshot") or []
    education = [
        EducationSchema(
            degree=str(item.get("degree", "") or ""),
            institution=str(item.get("institution", "") or ""),
            year=str(item.get("year", "") or ""),
        )
        for item in education_raw
        if isinstance(item, dict)
    ]

    languages_raw = payload.get("languages") or []
    languages = [LanguageSchema(language=str(lang), level="") for lang in languages_raw if lang]

    return CandidateProfileSchema(
        id=candidate_id,
        identity=IdentitySchema(name=str(payload.get("name", "") or "")),
        summary=str(payload.get("summary_text", "") or ""),
        experiences=experiences,
        education=education,
        skillsRaw=[str(s) for s in (payload.get("skills") or []) if s],
        languages=languages,
        certifications=[str(c) for c in (payload.get("certifications") or []) if c],
        totalExperienceYears=float(payload.get("experience_years", 0) or 0),
        location=str(payload.get("location", "") or ""),
    )


def job_offer_from_payload(job_id: str, payload: dict[str, Any]) -> JobOfferSchema:
    """Reconstruct a `JobOfferSchema` from a job's Qdrant payload."""
    return JobOfferSchema(
        id=job_id,
        title=str(payload.get("title", "") or ""),
        company=str(payload.get("company", "") or ""),
        requiredSkillsRaw=[str(s) for s in (payload.get("required_skills") or []) if s],
        niceToHaveSkillsRaw=[str(s) for s in (payload.get("nice_to_have_skills") or payload.get("preferred_skills") or []) if s],
        requiredCertifications=[str(c) for c in (payload.get("required_certifications") or []) if c],
        requiredExperienceYears=float(payload.get("experience_years", 0) or 0),
        location=str(payload.get("location", "") or ""),
        educationLevel=str(payload.get("education_level", "") or ""),
        languages=[str(lang) for lang in (payload.get("languages") or []) if lang],
        rawText=str(payload.get("summary_text", "") or ""),
    )


def candidate_profile_from_features(features: CandidateFeatures) -> CandidateProfileSchema:
    """Build a `CandidateProfileSchema` directly from freshly-analyzed
    `CandidateFeatures` (used right after `ProfileAnalyzer.analyze`, before
    indexing — avoids a redundant Qdrant round-trip)."""
    experiences = [
        ExperienceSchema(
            title=str(item.get("title", "") or ""),
            company=str(item.get("company", "") or ""),
            startDate=str(item.get("startDate", "") or ""),
            endDate=str(item.get("endDate", "") or ""),
            description=str(item.get("description", "") or ""),
            skillsUsed=[str(s) for s in (item.get("skillsUsed") or []) if s],
        )
        for item in features.experiences_snapshot
    ]
    education = [
        EducationSchema(
            degree=str(item.get("degree", "") or ""),
            institution=str(item.get("institution", "") or ""),
            year=str(item.get("year", "") or ""),
        )
        for item in features.education_snapshot
    ]
    languages = [LanguageSchema(language=lang, level="") for lang in features.languages if lang]

    return CandidateProfileSchema(
        id=features.candidate_id,
        identity=IdentitySchema(name=features.name),
        summary=features.summary_text,
        experiences=experiences,
        education=education,
        skillsRaw=list(features.skills),
        languages=languages,
        certifications=list(features.certifications),
        totalExperienceYears=features.experience_years,
        location=features.location,
    )


def job_offer_from_features(features: JobFeatures) -> JobOfferSchema:
    """Build a `JobOfferSchema` directly from freshly-analyzed `JobFeatures`."""
    return JobOfferSchema(
        id=features.job_id,
        title=features.title,
        company=features.company,
        requiredSkillsRaw=list(features.required_skills),
        niceToHaveSkillsRaw=list(features.nice_to_have_skills or features.preferred_skills),
        requiredCertifications=list(features.required_certifications),
        requiredExperienceYears=features.experience_years,
        location=features.location,
        educationLevel=features.education_level,
        languages=list(features.languages),
        rawText=features.summary_text,
    )
