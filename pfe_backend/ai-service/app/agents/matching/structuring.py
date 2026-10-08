from __future__ import annotations

import json
import logging
from typing import Any

from app.core.parsing import parse_json_object
from app.providers.base import AIProvider
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema

logger = logging.getLogger("smart-cv-ai-service")


class StructuringAgent:
    def __init__(self, provider: AIProvider | None = None) -> None:
        self.provider = provider

    async def run_candidate(self, candidate: CandidateProfileSchema, extracted_text: str) -> CandidateProfileSchema:
        # If the input candidate already has structured experiences/skills and no raw text is provided,
        # we can validate and return it directly.
        if not extracted_text or (candidate.experiences and candidate.skillsRaw and not candidate.rawText):
            return CandidateProfileSchema.model_validate(candidate.model_dump())

        if not self.provider:
            logger.warning("No AIProvider set for StructuringAgent. Returning candidate as-is.")
            return CandidateProfileSchema.model_validate(candidate.model_dump())

        prompt = f"""
        You are a senior data structuring assistant. Convert the following unstructured resume text into a strict JSON object.
        Return ONLY valid JSON matching this schema:
        {{
            "identity": {{
                "name": "Candidate Name",
                "location": "Candidate Location",
                "email": "email@example.com",
                "phone": "phone number"
            }},
            "summary": "Brief summary",
            "experiences": [
                {{
                    "title": "Job Title",
                    "company": "Company Name",
                    "startDate": "YYYY-MM-DD or YYYY",
                    "endDate": "YYYY-MM-DD or Present",
                    "description": "Responsibilities and achievements",
                    "skillsUsed": ["skill1", "skill2"]
                }}
            ],
            "education": [
                {{
                    "degree": "Degree/Diploma",
                    "institution": "University/School",
                    "year": "YYYY"
                }}
            ],
            "skillsRaw": ["skill1", "skill2"],
            "languages": [
                {{
                    "language": "English",
                    "level": "Fluent/Native/Intermediate"
                }}
            ],
            "certifications": ["Certification name"],
            "totalExperienceYears": 5.5
        }}

        Unstructured Resume Text:
        \"\"\"{extracted_text}\"\"\"
        """

        try:
            import asyncio
            generated = await asyncio.to_thread(self.provider.generate, prompt)
            structured_data = parse_json_object(generated)
            # Merge with existing candidate metadata if present
            merged = candidate.model_dump()
            merged.update(structured_data)
            return CandidateProfileSchema.model_validate(merged)
        except Exception as e:
            logger.exception(f"Failed to structure candidate profile: {e}. Returning fallback validation.")
            return CandidateProfileSchema.model_validate(candidate.model_dump())

    async def run_job_offer(self, job_offer: JobOfferSchema, extracted_text: str) -> JobOfferSchema:
        if not extracted_text or (job_offer.requiredSkillsRaw and not job_offer.rawText):
            return JobOfferSchema.model_validate(job_offer.model_dump())

        if not self.provider:
            logger.warning("No AIProvider set for StructuringAgent. Returning job offer as-is.")
            return JobOfferSchema.model_validate(job_offer.model_dump())

        prompt = f"""
        You are a senior data structuring assistant. Convert the following unstructured job offer text into a strict JSON object.
        Return ONLY valid JSON matching this schema:
        {{
            "title": "Job Title",
            "company": "Company Name",
            "missions": ["mission1", "mission2"],
            "requiredSkillsRaw": ["skill1", "skill2"],
            "niceToHaveSkillsRaw": ["skill3"],
            "requiredExperienceYears": 3.0,
            "contractType": "Full-Time/Contract/Remote/Hybrid",
            "location": "Location name",
            "salaryRange": {{"min": 50000, "max": 80000, "currency": "USD"}},
            "educationLevel": "Bachelor/Master",
            "languages": ["English"]
        }}

        Unstructured Job Offer Text:
        \"\"\"{extracted_text}\"\"\"
        """

        try:
            import asyncio
            generated = await asyncio.to_thread(self.provider.generate, prompt)
            structured_data = parse_json_object(generated)
            merged = job_offer.model_dump()
            merged.update(structured_data)
            return JobOfferSchema.model_validate(merged)
        except Exception as e:
            logger.exception(f"Failed to structure job offer: {e}. Returning fallback validation.")
            return JobOfferSchema.model_validate(job_offer.model_dump())
