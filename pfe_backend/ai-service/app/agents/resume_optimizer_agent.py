from __future__ import annotations

import json
from typing import Any, Dict, List

from pydantic import BaseModel, Field, ValidationError

from app.core.exceptions import AppException
from app.core.parsing import parse_json_object
from app.providers.base import AIProvider


class ResumeOptimizationResult(BaseModel):
    optimizedContent: Any
    addedKeywords: List[str] = Field(default_factory=list)
    modifiedSections: List[str] = Field(default_factory=list)
    summaryOfChanges: str = ""


class ResumeOptimizerAgent:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def build_prompt(
        self,
        resume_content: Any,
        missing_keywords: List[str],
        suggestions: List[str],
        job_description: str,
        language: str = "en",
    ) -> str:
        lang_instruction = "French" if language.lower() in ("fr", "french") else "English"
        resume_json = (
            json.dumps(resume_content, indent=2, ensure_ascii=False)
            if not isinstance(resume_content, str)
            else resume_content
        )
        missing_keywords_json = json.dumps(missing_keywords, ensure_ascii=False)
        suggestions_json = json.dumps(suggestions, ensure_ascii=False)

        return f"""
You are an elite ATS Optimization Strategist and Executive Resume Writer.

Your task is to take an existing CV / Resume and optimize the ENTIRE document based on an ATS score analysis containing MISSING KEYWORDS and AI SUGGESTIONS.

LANGUAGE REQUIREMENT:
Output text inside the CV ONLY in: {lang_instruction}

INPUT DATA:

1. CURRENT RESUME CONTENT:
{resume_json}

2. MISSING ATS KEYWORDS:
{missing_keywords_json}

3. AI ATS SUGGESTIONS / RECOMMENDATIONS:
{suggestions_json}

4. TARGET JOB DESCRIPTION:
{job_description}

---

🎯 OPTIMIZATION GOALS:

1. Integrate as many of the missing keywords naturally into:
   - The Professional Summary
   - The Skills list
   - Relevant Experience bullet points / achievements
   - Relevant Projects (if applicable)

2. Address the AI Suggestions across the CV:
   - Enhance experience bullet points with strong action verbs and impact metrics.
   - Refine skill titles to standard industry terms.
   - Polish the summary to be punchy, role-focused, and ATS-friendly (3-5 sentences).

3. STRICT CONSTRAINTS (DO NOT VIOLATE):
   - Keep 100% truthful to existing roles, companies, dates, education, and credentials.
   - DO NOT hallucinate fake job positions, companies, or degrees.
   - Maintain the overall structure of the input resume JSON so it maps cleanly to the original layout.

---

OUTPUT FORMAT (STRICT JSON):

Return ONLY a JSON object with this EXACT structure:

{{
  "optimizedContent": <THE FULL UPDATED CV JSON OBJECT IN THE SAME STRUCTURE AS INPUT>,
  "addedKeywords": ["Keyword1", "Keyword2"],
  "modifiedSections": ["Professional Summary", "Skills", "Work Experience"],
  "summaryOfChanges": "Concise 2-sentence summary of how the CV was enhanced with missing keywords and ATS recommendations."
}}

Do not include markdown wrappers outside the JSON, commentary, or extra text.
"""

    def run(
        self,
        resume_content: Any,
        missing_keywords: List[str],
        suggestions: List[str],
        job_description: str,
        language: str = "en",
    ) -> ResumeOptimizationResult:
        prompt = self.build_prompt(
            resume_content, missing_keywords, suggestions, job_description, language
        )
        generated_text = self.provider.generate(prompt)

        try:
            payload = parse_json_object(generated_text)
            return ResumeOptimizationResult.model_validate(payload)
        except (ValueError, ValidationError) as exc:
            raise AppException(
                code="RESUME_OPTIMIZE_FAILED",
                message="AI service failed to optimize the resume content",
                status_code=502,
                details=str(exc),
            ) from exc
