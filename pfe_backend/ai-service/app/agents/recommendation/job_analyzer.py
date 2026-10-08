"""Job Analyzer – extracts and normalises job offer features for the recommendation pipeline."""
from __future__ import annotations

import logging
from typing import Any

from app.agents.matching.normalization import NormalizationAgent
from app.config.settings import Settings
from app.schemas.recommendation import JobFeatures

logger = logging.getLogger("smart-cv-ai-service")

# Map Prisma enum values to human-readable labels
_EXPERIENCE_LEVEL_YEARS: dict[str, float] = {
    "ENTRY": 0.0,
    "JUNIOR": 1.0,
    "MID": 3.0,
    "SENIOR": 5.0,
    "LEAD": 8.0,
    "EXECUTIVE": 10.0,
}


class JobAnalyzer:
    """Transforms a raw job offer payload (from NestJS / Prisma) into a
    structured ``JobFeatures`` object for the recommendation pipeline."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.normalizer = NormalizationAgent(settings)

    def analyze(self, job_id: str, job_offer: dict[str, Any]) -> JobFeatures:
        """Extract recommendation-relevant features from a job offer payload."""

        title = str(job_offer.get("title", "")).strip()
        company_name, industry = self._extract_company_info(job_offer)

        # ── Skills ───────────────────────────────────────────────────────
        required_skills = self._normalize_skills(job_offer.get("requiredSkills") or [])
        preferred_skills = self._normalize_skills(job_offer.get("preferredSkills") or [])
        required_certifications = self._extract_str_list(job_offer.get("requiredCertifications"))

        # ── Experience ───────────────────────────────────────────────────
        exp_level = str(job_offer.get("experienceLevel", "")).upper()
        experience_years = _EXPERIENCE_LEVEL_YEARS.get(exp_level, 0.0)

        # ── Education ────────────────────────────────────────────────────
        education_level = str(job_offer.get("educationLevel", "") or "")
        education_rank = self.normalizer.education_rank(education_level) if education_level else 0

        # ── Location ─────────────────────────────────────────────────────
        location = str(job_offer.get("location", "") or "")
        country = str(job_offer.get("country", "") or "")
        city = str(job_offer.get("city", "") or "")

        # ── Salary ───────────────────────────────────────────────────────
        salary_min = self._parse_salary(job_offer.get("salaryMin"))
        salary_max = self._parse_salary(job_offer.get("salaryMax"))
        currency = str(job_offer.get("currency", "USD") or "USD")

        # ── Employment / workplace type ──────────────────────────────────
        employment_type = str(job_offer.get("employmentType", "") or "")
        workplace_type = str(job_offer.get("workplaceType", "") or "")

        # ── Languages ────────────────────────────────────────────────────
        languages = self._extract_languages(job_offer.get("languages"))

        # ── Responsibilities / Requirements ──────────────────────────────
        responsibilities = self._extract_str_list(job_offer.get("responsibilities"))
        requirements = self._extract_str_list(job_offer.get("requirements"))

        # ── Summary text for embedding ───────────────────────────────────
        summary_text = self._build_summary_text(
            title=title,
            company=company_name,
            industry=industry,
            description=str(job_offer.get("description", "") or ""),
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            responsibilities=responsibilities,
            requirements=requirements,
            languages=languages,
        )

        return JobFeatures(
            job_id=job_id,
            title=title,
            company=company_name,
            industry=industry,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            experience_years=experience_years,
            education_level=education_level,
            education_rank=education_rank,
            location=location,
            country=country,
            city=city,
            salary_min=salary_min,
            salary_max=salary_max,
            currency=currency,
            employment_type=employment_type,
            workplace_type=workplace_type,
            languages=languages,
            responsibilities=responsibilities,
            requirements=requirements,
            summary_text=summary_text,
            required_certifications=required_certifications,
            nice_to_have_skills=preferred_skills,
        )

    # ── Private helpers ───────────────────────────────────────────────────

    def _extract_company_info(self, job_offer: dict[str, Any]) -> tuple[str, str]:
        """Return (company_name, industry) from the job offer's company field,
        which may be a nested dict or a plain string."""
        company_data = job_offer.get("company") or {}
        if isinstance(company_data, dict):
            return company_data.get("name", ""), company_data.get("industry", "")
        return str(company_data), ""

    def _extract_str_list(self, raw: list | None) -> list[str]:
        return [str(item).strip() for item in (raw or []) if item]

    def _extract_languages(self, raw: list | None) -> list[str]:
        return [str(lang).strip().lower() for lang in (raw or []) if lang]

    def _normalize_skills(self, raw: list) -> list[str]:
        seen: set[str] = set()
        normalised: list[str] = []
        for item in raw:
            skill = str(item).strip() if item else ""
            if not skill:
                continue
            canonical = self.normalizer.canonical_skill(skill)
            if canonical and canonical not in seen:
                seen.add(canonical)
                normalised.append(canonical)
        return normalised

    def _parse_salary(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _build_summary_text(
        self,
        *,
        title: str,
        company: str,
        industry: str,
        description: str,
        required_skills: list[str],
        preferred_skills: list[str],
        responsibilities: list[str],
        requirements: list[str],
        languages: list[str],
    ) -> str:
        """Build rich text block for embedding generation."""
        parts: list[str] = []
        if title:
            parts.append(f"Job Title: {title}")
        if company:
            parts.append(f"Company: {company}")
        if industry:
            parts.append(f"Industry: {industry}")
        if description:
            # Truncate long descriptions to keep embedding focused
            parts.append(description[:500])
        if required_skills:
            parts.append(f"Required Skills: {', '.join(required_skills)}")
        if preferred_skills:
            parts.append(f"Preferred Skills: {', '.join(preferred_skills)}")
        if responsibilities:
            parts.append(f"Responsibilities: {'; '.join(responsibilities[:5])}")
        if requirements:
            parts.append(f"Requirements: {'; '.join(requirements[:5])}")
        if languages:
            parts.append(f"Languages: {', '.join(languages)}")
        return " | ".join(parts)
