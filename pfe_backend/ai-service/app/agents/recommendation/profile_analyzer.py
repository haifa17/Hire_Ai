"""Profile Analyzer – extracts and normalises candidate features for the recommendation pipeline."""
from __future__ import annotations

import logging
from typing import Any

from app.agents.matching.normalization import NormalizationAgent
from app.config.settings import Settings
from app.schemas.recommendation import CandidateFeatures

logger = logging.getLogger("smart-cv-ai-service")


class ProfileAnalyzer:
    """Transforms a raw candidate profile (dict from NestJS) into a
    structured ``CandidateFeatures`` object suitable for embedding
    generation and business scoring."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.normalizer = NormalizationAgent(settings)

    def analyze(self, candidate_id: str, profile: dict[str, Any]) -> CandidateFeatures:
        """Extract recommendation-relevant features from a candidate profile payload."""
        user_data = profile.get("user", {}) or {}
        prof = profile.get("profile", {}) or {}

        # ── Name / identity ──────────────────────────────────────────────
        first = user_data.get("firstName", "")
        last = user_data.get("lastName", "")
        name = f"{first} {last}".strip()

        # ── Skills ───────────────────────────────────────────────────────
        raw_skills = self._extract_skills(prof)
        skills = self._normalize_skills(raw_skills)

        # ── Experience ───────────────────────────────────────────────────
        experiences = prof.get("experiences") or []
        exp_years, exp_titles = self._extract_experience(experiences)

        # ── Education ────────────────────────────────────────────────────
        education = prof.get("education") or []
        education_level, education_rank = self._best_education(education)

        # ── Location ─────────────────────────────────────────────────────
        location = user_data.get("address", "") or ""

        # ── Salary ───────────────────────────────────────────────────────
        desired_salary = self._parse_desired_salary(prof.get("desiredSalary"))

        # ── Languages ────────────────────────────────────────────────────
        languages_raw = prof.get("languages") or []
        languages = self._extract_languages(languages_raw)

        # ── Certifications ───────────────────────────────────────────────
        certifications = self._extract_certifications(prof.get("certifications"))

        # ── Desired position ─────────────────────────────────────────────
        desired_position = prof.get("desiredPosition", "") or ""

        # ── Open to work ─────────────────────────────────────────────────
        open_to_work = bool(prof.get("openToWork", False))

        # ── Build summary text (for embedding) ──────────────────────────
        summary_text = self._build_summary_text(
            name=name,
            summary=prof.get("professionalSummary", "") or "",
            skills=skills,
            exp_titles=exp_titles,
            education=education,
            certifications=certifications,
            desired_position=desired_position,
            languages=languages,
        )

        experiences_snapshot = self._experiences_snapshot(experiences)
        education_snapshot = self._education_snapshot(education)

        return CandidateFeatures(
            candidate_id=candidate_id,
            name=name,
            skills=skills,
            experience_years=exp_years,
            education_level=education_level,
            education_rank=education_rank,
            location=location,
            desired_salary=desired_salary,
            languages=languages,
            certifications=certifications,
            desired_position=desired_position,
            open_to_work=open_to_work,
            summary_text=summary_text,
            experiences_snapshot=experiences_snapshot,
            education_snapshot=education_snapshot,
        )

    # ── Private helpers ───────────────────────────────────────────────────

    def _extract_experience(self, experiences: Any) -> tuple[float, list[str]]:
        """Return (total years, titles) from an experiences list, or (0.0, []) if malformed."""
        if not isinstance(experiences, list):
            return 0.0, []
        exp_years = self._compute_experience_years(experiences)
        exp_titles = [
            exp.get("title", "") for exp in experiences if isinstance(exp, dict) and exp.get("title")
        ]
        return exp_years, exp_titles

    def _parse_desired_salary(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (TypeError, ValueError):
            return None

    def _extract_certifications(self, raw: Any) -> list[str]:
        if not isinstance(raw, list):
            return []
        return [str(c).strip() for c in raw if c]

    def _extract_skills(self, profile: dict[str, Any]) -> list[str]:
        """Pull skills from various profile fields."""
        skills_field = profile.get("skills")
        if not skills_field:
            return []

        # skills can be a list of strings or list of dicts with "name" key
        result: list[str] = []
        if isinstance(skills_field, list):
            for item in skills_field:
                if isinstance(item, str):
                    result.append(item)
                elif isinstance(item, dict):
                    name = item.get("name") or item.get("skill") or ""
                    if name:
                        result.append(str(name))
        return result

    def _normalize_skills(self, raw: list[str]) -> list[str]:
        """Canonical normalisation via the existing NormalizationAgent."""
        seen: set[str] = set()
        normalised: list[str] = []
        for skill in raw:
            canonical = self.normalizer.canonical_skill(skill)
            if canonical and canonical not in seen:
                seen.add(canonical)
                normalised.append(canonical)
        return normalised

    def _compute_experience_years(self, experiences: list[dict]) -> float:
        """Estimate total years of experience from experience entries."""
        total = 0.0
        for exp in experiences:
            if isinstance(exp, dict):
                total += self._experience_entry_years(exp)
        return round(total, 1)

    def _experience_entry_years(self, exp: dict) -> float:
        """Years contributed by a single experience entry: prefer an explicit
        duration field, else estimate from start/end dates."""
        years = exp.get("years") or exp.get("duration_years")
        if years is not None:
            try:
                return float(years)
            except (TypeError, ValueError):
                pass

        start = exp.get("startDate", "")
        if not start:
            return 0.0

        end = exp.get("endDate", "")
        try:
            start_year = int(str(start)[:4])
            end_year = int(str(end)[:4]) if end and str(end)[:4].isdigit() else 2026
            return max(0, end_year - start_year)
        except (ValueError, IndexError):
            return 1.0  # fallback: assume 1 year

    def _best_education(self, education: list) -> tuple[str, int]:
        """Return the highest education level and its rank."""
        best_level = ""
        best_rank = 0
        for item in education if isinstance(education, list) else []:
            if not isinstance(item, dict):
                continue
            degree = item.get("degree", "") or item.get("level", "") or ""
            rank = self.normalizer.education_rank(degree)
            if rank > best_rank:
                best_rank = rank
                best_level = degree
        return best_level, best_rank

    def _experiences_snapshot(self, experiences: list) -> list[dict[str, Any]]:
        """Structured experience entries for `ExperienceSchema` reconstruction
        (title/company/description/skillsUsed) — used by the unified scoring
        engine's `projects`/`experience` criteria at fine-scoring time."""
        snapshot: list[dict[str, Any]] = []
        for exp in experiences if isinstance(experiences, list) else []:
            if not isinstance(exp, dict):
                continue
            skills_used = exp.get("skillsUsed") or exp.get("skills_used") or exp.get("technologies") or []
            if not isinstance(skills_used, list):
                skills_used = []
            snapshot.append(
                {
                    "title": str(exp.get("title", "") or ""),
                    "company": str(exp.get("company", "") or ""),
                    "startDate": str(exp.get("startDate", "") or ""),
                    "endDate": str(exp.get("endDate", "") or ""),
                    "description": str(exp.get("description", "") or ""),
                    "skillsUsed": [str(s) for s in skills_used if s],
                }
            )
        return snapshot

    def _education_snapshot(self, education: list) -> list[dict[str, Any]]:
        """Structured education entries for `EducationSchema` reconstruction."""
        snapshot: list[dict[str, Any]] = []
        for item in education if isinstance(education, list) else []:
            if not isinstance(item, dict):
                continue
            degree = item.get("degree", "") or item.get("level", "") or ""
            snapshot.append(
                {
                    "degree": str(degree),
                    "institution": str(item.get("institution", "") or ""),
                    "year": str(item.get("year", "") or ""),
                }
            )
        return snapshot

    def _extract_languages(self, languages_raw: list) -> list[str]:
        """Extract language names from various formats."""
        result: list[str] = []
        for item in languages_raw if isinstance(languages_raw, list) else []:
            if isinstance(item, str):
                result.append(item.strip().lower())
            elif isinstance(item, dict):
                lang = item.get("language", "") or item.get("name", "")
                if lang:
                    result.append(str(lang).strip().lower())
        return result

    def _build_summary_text(
        self,
        *,
        name: str,
        summary: str,
        skills: list[str],
        exp_titles: list[str],
        education: list,
        certifications: list[str],
        desired_position: str,
        languages: list[str],
    ) -> str:
        """Build a single rich text block combining all profile signals for embedding generation."""
        parts: list[str] = []
        if name:
            parts.append(name)
        if desired_position:
            parts.append(f"Desired position: {desired_position}")
        if summary:
            parts.append(summary)
        if skills:
            parts.append(f"Skills: {', '.join(skills)}")
        if exp_titles:
            parts.append(f"Experience: {', '.join(exp_titles[:10])}")
        edu_summary = self._format_education_summary(education)
        if edu_summary:
            parts.append(edu_summary)
        if certifications:
            parts.append(f"Certifications: {', '.join(certifications[:5])}")
        if languages:
            parts.append(f"Languages: {', '.join(languages)}")
        return " | ".join(parts)

    def _format_education_summary(self, education: Any) -> str:
        """Build the "Education: X at Y, ..." summary fragment, or "" if none."""
        if not isinstance(education, list):
            return ""
        edu_texts = []
        for item in education:
            if not isinstance(item, dict):
                continue
            deg = item.get("degree", "")
            inst = item.get("institution", "")
            if deg or inst:
                edu_texts.append(f"{deg} at {inst}".strip())
        if not edu_texts:
            return ""
        return f"Education: {', '.join(edu_texts[:5])}"
