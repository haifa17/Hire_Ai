from __future__ import annotations

import json
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from app.core.exceptions import AppException
from app.core.parsing import parse_json_object
from app.providers.base import AIProvider


class ATSScoreBreakdown(BaseModel):
    keywordMatch: int = Field(ge=0, le=100)
    skillsMatch: int = Field(ge=0, le=100)
    experienceRelevance: int = Field(ge=0, le=100)
    formattingQuality: int = Field(ge=0, le=100)
    educationMatch: int = Field(ge=0, le=100)


class ATSScore(BaseModel):
    overall: int = Field(ge=0, le=100)
    breakdown: ATSScoreBreakdown
    matchedKeywords: list[str]
    missingKeywords: list[str]
    suggestions: list[str]


class ATSScoringAgent:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def build_prompt(self, resume_content: Any, job_description: str) -> str:
        resume_json = (
            json.dumps(resume_content, indent=2, ensure_ascii=False)
            if not isinstance(resume_content, str)
            else resume_content
        )

        return f"""
You are an expert ATS evaluator, recruiter, and resume optimization analyst.

Your mission is to score how well a resume matches a specific job description.

INPUT DATA:

RESUME CONTENT:
{resume_json}

JOB DESCRIPTION:
{job_description}

---

SCORING RULES:

1. Score every dimension from 0 to 100.
2. Be strict but practical.
3. Favor evidence present in the resume over assumptions.
4. Return concise keyword lists.
5. Provide actionable suggestions that explain how to improve the match.

DIMENSIONS:

- keywordMatch: overlap between the job description and resume keywords
- skillsMatch: alignment of technical and soft skills
- experienceRelevance: how strongly the experience supports the target role
- formattingQuality: readability, structure, and ATS friendliness
- educationMatch: relevance of education and certifications to the role

OUTPUT FORMAT (STRICT JSON):

Return ONLY this JSON object:

{{
  "overall": 82,
  "breakdown": {{
    "keywordMatch": 85,
    "skillsMatch": 80,
    "experienceRelevance": 78,
    "formattingQuality": 90,
    "educationMatch": 75
  }},
  "matchedKeywords": ["Python", "REST API", "Docker"],
  "missingKeywords": ["Kubernetes", "CI/CD"],
  "suggestions": [
    "Add Kubernetes experience to skills section",
    "Mention CI/CD pipelines in experience bullets"
  ]
}}

Do not include markdown, explanations, or extra keys.
"""

    def run(self, resume_content: Any, job_description: str) -> ATSScore:
        prompt = self.build_prompt(resume_content, job_description)
        generated_text = self.provider.generate(prompt)

        try:
            payload = parse_json_object(generated_text)
            return ATSScore.model_validate(payload)
        except (ValueError, ValidationError) as exc:
            raise AppException(
                code="ATS_BAD_RESPONSE",
                message="ATS scoring model returned an invalid payload",
                status_code=502,
                details=str(exc),
            ) from exc
