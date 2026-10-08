from __future__ import annotations

import logging
import re
from dataclasses import dataclass

from app.config.settings import Settings
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema

logger = logging.getLogger("smart-cv-ai-service")

NODEJS_ALIAS = "node.js"
NESTJS_ALIAS = "nest.js"
CICD_ALIAS = "ci/cd"

SKILL_ALIASES = {
    "js": "javascript",
    "javascript": "javascript",
    "es6": "javascript",
    "node": NODEJS_ALIAS,
    "nodejs": NODEJS_ALIAS,
    "node.js": NODEJS_ALIAS,
    "ts": "typescript",
    "typescript": "typescript",
    "reactjs": "react",
    "react.js": "react",
    "react": "react",
    "nestjs": NESTJS_ALIAS,
    "nest": NESTJS_ALIAS,
    "nest.js": NESTJS_ALIAS,
    "python": "python",
    "fastapi": "fastapi",
    "django": "django",
    "sql": "sql",
    "postgres": "postgresql",
    "postgresql": "postgresql",
    "docker": "docker",
    "k8s": "kubernetes",
    "kubernetes": "kubernetes",
    "ci/cd": CICD_ALIAS,
    "ci cd": CICD_ALIAS,
}

IMPLICIT_SKILLS = {
    "django": ("python", 0.95),
    "fastapi": ("python", 0.90),
    "flask": ("python", 0.85),
    "nestjs": ("typescript", 0.90),
    "angular": ("typescript", 0.85),
    "react": ("javascript", 0.90),
    "vue": ("javascript", 0.85),
    "express": ("javascript", 0.85),
    "spring": ("java", 0.95),
    "laravel": ("php", 0.95),
    "rails": ("ruby", 0.95),
}

EDUCATION_RANKING = {
    # English rankings
    "high_school": 1,
    "associate": 2,
    "bachelor": 3,
    "master": 4,
    "phd": 5,
    "other": 1,
    # French rankings & abbreviations
    "bac": 1,
    "bts": 2,
    "dut": 2,
    "deust": 2,
    "licence": 3,
    "licence_professionnelle": 3,
    "bachelor_francais": 3,
    "maitrise": 3,
    "master_1": 3,
    "master_2": 4,
    "diplome_d_ingenieur": 4,
    "diplome_d_ingénieur": 4,
    "diplome_ingenieur": 4,
    "diplome_ingénieur": 4,
    "ingenieur": 4,
    "ingénieur": 4,
    "bac+3": 3,
    "bac+4": 3,
    "bac+5": 4,
    "doctorat": 5,
    "ph.d": 5,
}


@dataclass(slots=True)
class NormalizedSkill:
    canonical: str
    raw: str
    inferred: bool = False
    confidence: float = 1.0


class NormalizationAgent:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    def normalize_candidate(self, candidate: CandidateProfileSchema, db_mappings: dict[str, str] | None = None) -> CandidateProfileSchema:
        payload = candidate.model_dump()
        raw_skills = payload.get("skillsRaw", [])
        normalized = self._normalize_skills(raw_skills, db_mappings)
        payload["skillsRaw"] = normalized
        payload["location"] = self._clean_text(payload.get("location", ""))
        payload["summary"] = self._clean_text(payload.get("summary", ""))
        return CandidateProfileSchema.model_validate(payload)

    def normalize_job_offer(self, job_offer: JobOfferSchema, db_mappings: dict[str, str] | None = None) -> JobOfferSchema:
        payload = job_offer.model_dump()
        payload["requiredSkillsRaw"] = self._normalize_skills(payload.get("requiredSkillsRaw", []), db_mappings)
        payload["niceToHaveSkillsRaw"] = self._normalize_skills(payload.get("niceToHaveSkillsRaw", []), db_mappings)
        payload["title"] = self._clean_text(payload.get("title", ""))
        payload["location"] = self._clean_text(payload.get("location", ""))
        payload["contractType"] = self._clean_text(payload.get("contractType", ""))
        return JobOfferSchema.model_validate(payload)

    def canonical_skill(self, skill: str, db_mappings: dict[str, str] | None = None) -> str:
        cleaned = self._clean_text(skill).lower()
        cleaned = re.sub(r"[^a-z0-9+/.-]+", " ", cleaned).strip()
        cleaned = re.sub(r"\s+", " ", cleaned)
        if not cleaned:
            return ""

        # Check DB pre-loaded mappings
        if db_mappings and cleaned in db_mappings:
            return db_mappings[cleaned]

        # Static synonym lookup
        return SKILL_ALIASES.get(cleaned, cleaned)

    def education_rank(self, value: str) -> int:
        normalized = self._clean_text(value).lower().replace("-", "_").replace(" ", "_")
        # Strip accents for French comparison
        normalized = normalized.replace("é", "e").replace("è", "e").replace("ê", "e").replace("ë", "e")
        normalized = normalized.replace("à", "a").replace("â", "a")
        normalized = normalized.replace("î", "i").replace("ï", "i")
        normalized = normalized.replace("ô", "o").replace("ö", "o")
        normalized = normalized.replace("û", "u").replace("ü", "u").replace("ù", "u")
        normalized = normalized.replace("ç", "c")
        
        # Look up directly or do substring matching for common degrees
        if "doctorat" in normalized or "phd" in normalized or "ph.d" in normalized:
            return 5
        if "master" in normalized or "ingenieur" in normalized or "bac+5" in normalized:
            return 4
        if "bachelor" in normalized or "licence" in normalized or "bac+3" in normalized or "bac+4" in normalized:
            return 3
        if "associate" in normalized or "bts" in normalized or "dut" in normalized or "bac+2" in normalized:
            return 2
        if "bac" in normalized or "high_school" in normalized:
            return 1
            
        return EDUCATION_RANKING.get(normalized, 0)

    def _normalize_skills(self, values: list[str], db_mappings: dict[str, str] | None = None) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for value in values:
            if not isinstance(value, str):
                continue
            canonical = self.canonical_skill(value, db_mappings)
            if canonical and canonical not in seen:
                seen.add(canonical)
                normalized.append(canonical)

                # Skill inference: Django -> implies Python
                if canonical in IMPLICIT_SKILLS:
                    implied, _ = IMPLICIT_SKILLS[canonical]
                    if implied not in seen:
                        seen.add(implied)
                        normalized.append(implied)
                        
        return normalized

    def _clean_text(self, value: str) -> str:
        if not isinstance(value, str):
            return ""
        return re.sub(r"\s+", " ", value).strip()
