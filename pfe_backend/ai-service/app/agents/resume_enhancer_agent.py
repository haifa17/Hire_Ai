from __future__ import annotations

import json
from typing import Any, Dict

from app.core.parsing import parse_json_object
from app.providers.base import AIProvider


class ResumeEnhancerAgent:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def build_prompt(self, resume_text: str, job_description: str, language: str) -> str:
        lang_instruction = "French" if language.lower() in ("fr", "french") else "English"

        return f"""
You are an expert ATS resume strategist, senior recruiter, and executive resume writer.

Your mission is to ENHANCE and RE-WRITE an existing CV / resume extracted from an uploaded document, tailoring it specifically for a target job description.

LANGUAGE REQUIREMENT:
Write the output resume ONLY in: {lang_instruction}

INPUT DATA:

1. UPLOADED RESUME CONTENT (SOURCE DOCUMENT):
{resume_text}

2. TARGET JOB DESCRIPTION:
{job_description}

---

🎯 OBJECTIVE & INSTRUCTIONS:

1. EXTRACT & STRUCTURE:
   Parse all relevant information from the uploaded resume into clean, structured sections:
   - Personal Info (name, professional title, email, phone, location)
   - Social Links (LinkedIn, GitHub, Portfolio, etc.)
   - Professional Summary
   - Technical and Soft Skills
   - Work Experience (company, title, dates, achievements)
   - Education (degree, institution, dates)
   - Projects (title, description, technologies, url)
   - Languages
   - Certifications

2. ENHANCE & OPTIMIZE:
   - Professional Summary: Re-write into 3–5 punchy, role-focused sentences incorporating key ATS keywords from the target job description.
   - Work Experience: Enhance each bullet point to start with strong action verbs, show measurable impact/value, and naturally integrate relevant keywords from the job description while staying true to the uploaded work history.
   - Skills: Deduplicate, normalize names (e.g. "JavaScript", not "JS"), and ensure all relevant skills mentioned in the resume or matching the job description are present.
   - Format: Format dates cleanly and consistently.

3. CONSTRAINTS:
   - Stay truthful to the candidate's actual work history, companies, and dates found in the uploaded text.
   - Do NOT invent fake job positions, fake companies, or fake degrees.
   - Output MUST be valid JSON ONLY.
   - NO markdown wrappers, NO extra commentary outside the JSON.

---

OUTPUT FORMAT (STRICT JSON ONLY):

Return this exact JSON structure:

{{
    "personalInfo": {{
        "name": "...",
        "professionalTitle": "...",
        "email": "...",
        "phone": "...",
        "location": "..."
    }},
    "socialLinks": [
        {{ "platform": "LinkedIn|GitHub|Portfolio|Other", "url": "..." }}
    ],
    "professionalSummary": "...",
    "skills": ["...", "..."],
    "experience": [
        {{
            "title": "...",
            "company": "...",
            "dates": "...",
            "achievements": ["...", "..."]
        }}
    ],
    "education": [
        {{
            "degree": "...",
            "institution": "...",
            "dates": "..."
        }}
    ],
    "projects": [
        {{
            "title": "...",
            "description": "...",
            "technologies": ["...", "..."],
            "url": "..."
        }}
    ],
    "languages": [
        {{
            "name": "...",
            "level": "..."
        }}
    ],
    "certifications": [
        {{
            "name": "...",
            "issuer": "...",
            "date": "...",
            "credentialId": "..."
        }}
    ]
}}

---

FINAL INSTRUCTION:
Return ONLY the raw JSON object.
Ensure it is valid and parsable.
"""

    def run(self, resume_text: str, job_description: str, language: str) -> Dict[str, Any]:
        prompt = self.build_prompt(resume_text, job_description, language)
        generated_text = self.provider.generate(prompt)

        try:
            return parse_json_object(generated_text)
        except ValueError:
            return {"rawMarkdown": generated_text}
