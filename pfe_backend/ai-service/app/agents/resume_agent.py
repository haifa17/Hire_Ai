from __future__ import annotations

import json
from typing import Any, Dict

from app.core.parsing import parse_json_object
from app.providers.base import AIProvider


class ResumeGenerationAgent:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def build_prompt(self, profile: Dict[str, Any], job_description: str, language: str) -> str:
        lang_instruction = "French" if language.lower() == "fr" else "English"

        return f"""
You are a senior ATS resume strategist, recruiter, and career coach.

Your mission is to generate a HIGH-QUALITY, ATS-optimized resume tailored to a specific job description.

LANGUAGE:
Write the resume ONLY in: {lang_instruction}

INPUT DATA:

CANDIDATE PROFILE (SOURCE OF TRUTH):
{json.dumps(profile, indent=2, ensure_ascii=False)}

JOB DESCRIPTION (TARGET):
{job_description}

---

🎯 OBJECTIVE:

Create a resume that:
- Maximizes ATS matching score
- Aligns with the job requirements
- Highlights the most relevant experience
- Remains 100% truthful to the profile

---

 HARD CONSTRAINTS (CRITICAL):

1. NEVER invent:
   - companies
   - roles
   - dates
   - metrics
   - certifications
   - links
2. If data is missing → use:
   - "" for strings
   - [] for arrays
3. DO NOT hallucinate numbers or achievements
4. Output MUST be valid JSON ONLY
5. NO markdown, NO explanations, NO extra text

---

 ATS OPTIMIZATION STRATEGY:

1. Extract important keywords from the job description:
   - skills
   - tools
   - technologies
   - responsibilities

2. Reuse and adapt ONLY matching elements from the profile

3. Inject relevant keywords naturally into:
   - summary
   - skills
   - experience bullets

4. Prioritize:
   - most relevant experiences FIRST
   - most recent roles FIRST

---

 WRITING RULES:

### Professional Summary:
- 3–5 concise sentences
- role-focused
- include key ATS keywords
- avoid generic phrases

### Experience (VERY IMPORTANT):
Each bullet MUST:
- start with a strong action verb
- be specific and concise
- show impact or value
- be adapted to the job description

GOOD example:
"Developed REST APIs using Node.js improving system response time by 30%"

BAD example:
"Worked on backend development"

### Skills:
- deduplicate
- normalize naming (e.g., "JavaScript", not "JS")
- group logically if needed

### Projects:
- include only relevant ones
- highlight technologies and purpose

---

 DATA CLEANING RULES:

- Remove duplicates
- Trim spaces
- Normalize capitalization
- Keep consistent date format
- Ensure URLs are valid (http/https)

---

OUTPUT FORMAT (STRICT JSON):

Return ALL fields below, even if empty:

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
Do NOT include any explanation or markdown.
"""

    def run(self, profile: Dict[str, Any], job_description: str, language: str) -> Dict[str, Any]:
        prompt = self.build_prompt(profile, job_description, language)
        generated_text = self.provider.generate(prompt)

        try:
            return parse_json_object(generated_text)
        except ValueError:
            return {"rawMarkdown": generated_text}
