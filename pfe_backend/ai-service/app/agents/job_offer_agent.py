from __future__ import annotations

from typing import Any, Dict

from app.core.parsing import parse_json_object
from app.providers.base import AIProvider

DEFAULT_JOB_OFFER_TITLE = "Generated Job Offer"


class JobOfferGenerationAgent:
    def __init__(self, provider: AIProvider) -> None:
        self.provider = provider

    def build_prompt(self, prompt: str, language: str) -> str:
        lang_instruction = "French" if language.lower() == "fr" else "English"

        return f"""
You are a senior recruiter, talent acquisition lead, and job offer strategist.

Your mission is to turn a short recruiter prompt into a structured job offer draft that can pre-fill a recruiting form.

LANGUAGE:
Write the output ONLY in: {lang_instruction}

INPUT PROMPT:
{prompt}

HARD CONSTRAINTS:

1. Output valid JSON only.
2. No markdown, no code fences, no explanations.
3. Do not invent company-specific facts.
4. If information is missing, use empty strings, empty arrays, or safe defaults.
5. Prefer concise, recruiter-friendly wording.

OBJECTIVE:

Generate a job draft that is useful for a recruiter to quickly fill a job offer form.

REQUIRED JSON SHAPE:

{{
  "title": "...",
  "summary": "...",
  "department": "...",
  "employmentType": "FULL_TIME|PART_TIME|CONTRACT|CDD|CDI|TEMPORARY|INTERNSHIP|FREELANCE",
  "workplaceType": "ONSITE|HYBRID|REMOTE",
  "location": "...",
  "country": "...",
  "city": "...",
  "experienceLevel": "ENTRY|JUNIOR|MID|SENIOR|LEAD|EXECUTIVE",
  "educationLevel": "HIGH_SCHOOL|ASSOCIATE|BACHELOR|MASTER|PHD|OTHER|null",
  "currency": "...",
  "salaryMin": null,
  "salaryMax": null,
  "openings": 1,
  "responsibilities": ["..."],
  "requirements": ["..."],
  "requiredSkills": ["..."],
  "preferredSkills": ["..."],
  "benefits": ["..."],
  "languages": ["..."],
  "keywords": ["..."],
  "featured": false,
  "urgent": false
}}

GUIDELINES:

- title: specific and market-friendly, mirrors how candidates search for this role
- summary: 3 to 5 short paragraphs (not just one line) written as the actual job description body — cover the mission of the role, what the person will work on day to day, and what makes the opportunity attractive. This text is used as-is in the job posting's description field, so it must read as complete and polished, not as a teaser.
- responsibilities: 5 to 8 items, each a concrete action starting with a verb, specific to this role (avoid generic filler like "collaborate with teams" unless nothing more specific can be inferred)
- requirements: 5 to 8 items, mixing years of experience, hard skills, and any qualifications implied by the prompt
- requiredSkills: 6 to 12 items, concrete technologies/skills mentioned or clearly implied by the prompt (avoid soft-skill filler such as "Teamwork" unless the prompt is genuinely too vague for anything else)
- preferredSkills: optional, 0 to 6 items, "nice to have" skills adjacent to the required ones
- benefits: 4 to 8 items
- keywords: 6 to 12 items useful for search and filtering
- openings: use 1 unless the prompt clearly suggests otherwise
- currency: default to USD if the prompt does not specify another currency
- salaryMin / salaryMax: ONLY set these to numbers if the prompt states or clearly implies a range or figure. Otherwise leave both as null — never invent a salary.
- workplaceType: infer only if obvious, otherwise default to REMOTE
- employmentType: default to FULL_TIME
- experienceLevel: default to MID, but read cues like "senior", "junior", "lead", "5+ years" carefully

FINAL INSTRUCTION:

Return only the raw JSON object.
""".strip()

    def run(self, prompt: str, language: str) -> Dict[str, Any]:
        ai_prompt = self.build_prompt(prompt, language)
        generated_text = self.provider.generate(ai_prompt)

        try:
            return self.normalize(parse_json_object(generated_text))
        except ValueError:
            return self.fallback(prompt)

    def normalize(self, payload: Dict[str, Any]) -> Dict[str, Any]:
        title = self.ensure_string(payload.get("title"), DEFAULT_JOB_OFFER_TITLE)

        result = {
            "title": title,
            "summary": self.ensure_string(
                payload.get("summary"),
                f"We are hiring for {title}. The role focuses on delivering reliable "
                "results, collaborating across teams, and contributing to business "
                "impact.",
            ),
            "department": self.ensure_string(payload.get("department")),
            "employmentType": self.ensure_enum(
                payload.get("employmentType"),
                {"FULL_TIME", "PART_TIME", "CONTRACT", "CDD", "CDI", "TEMPORARY", "INTERNSHIP", "FREELANCE"},
                "FULL_TIME",
            ),
            "workplaceType": self.ensure_enum(
                payload.get("workplaceType"),
                {"ONSITE", "HYBRID", "REMOTE"},
                "REMOTE",
            ),
            "location": self.ensure_string(payload.get("location")),
            "country": self.ensure_string(payload.get("country")),
            "city": self.ensure_string(payload.get("city")),
            "experienceLevel": self.ensure_enum(
                payload.get("experienceLevel"),
                {"ENTRY", "JUNIOR", "MID", "SENIOR", "LEAD", "EXECUTIVE"},
                "MID",
            ),
            "educationLevel": self.ensure_optional_enum(
                payload.get("educationLevel"),
                {"HIGH_SCHOOL", "ASSOCIATE", "BACHELOR", "MASTER", "PHD", "OTHER"},
            ),
            "currency": self.ensure_currency(payload.get("currency")),
            "salaryMin": self.ensure_optional_number(payload.get("salaryMin")),
            "salaryMax": self.ensure_optional_number(payload.get("salaryMax")),
            "openings": self.ensure_int(payload.get("openings"), 1, minimum=1, maximum=50),
            "responsibilities": self.ensure_string_array(payload.get("responsibilities")),
            "requirements": self.ensure_string_array(payload.get("requirements")),
            "requiredSkills": self.ensure_string_array(payload.get("requiredSkills")),
            "preferredSkills": self.ensure_string_array(payload.get("preferredSkills")),
            "benefits": self.ensure_string_array(payload.get("benefits")),
            "languages": self.ensure_string_array(payload.get("languages")),
            "keywords": self.ensure_string_array(payload.get("keywords")),
            "featured": self.ensure_bool(payload.get("featured"), False),
            "urgent": self.ensure_bool(payload.get("urgent"), False),
        }

        if (
            result["salaryMin"] is not None
            and result["salaryMax"] is not None
            and result["salaryMin"] > result["salaryMax"]
        ):
            result["salaryMin"], result["salaryMax"] = (
                result["salaryMax"],
                result["salaryMin"],
            )

        return result

    def fallback(self, prompt: str) -> Dict[str, Any]:
        title = self.infer_title(prompt)
        return {
            "title": title,
            "summary": (
                f"We are hiring for {title}. The role focuses on delivering reliable "
                "results, collaborating across teams, and contributing to business "
                "impact.\n\nThe successful candidate will work closely with "
                "stakeholders to plan, execute, and refine work in this area, "
                "bringing both technical rigor and clear communication to the team."
            ),
            "department": "",
            "employmentType": "FULL_TIME",
            "workplaceType": "REMOTE",
            "location": "",
            "country": "",
            "city": "",
            "experienceLevel": "MID",
            "educationLevel": None,
            "currency": "USD",
            "salaryMin": None,
            "salaryMax": None,
            "openings": 1,
            "responsibilities": [
                "Design and deliver high-quality features aligned with team goals.",
                "Collaborate with product, design, and engineering stakeholders.",
                "Write maintainable, tested, and documented code or content.",
                "Review work carefully and support continuous improvement.",
                "Contribute to reliability, performance, and user experience.",
            ],
            "requirements": [
                "Relevant experience for the role",
                "Strong communication skills",
                "Problem-solving mindset",
            ],
            "requiredSkills": self.infer_skills(prompt)
            or ["Communication", "Teamwork", "Problem Solving", "Attention to Detail"],
            "preferredSkills": [],
            "benefits": ["Growth opportunities", "Collaborative environment", "Flexible working style"],
            "languages": [],
            "keywords": self.ensure_string_array(prompt.split()),
            "featured": False,
            "urgent": False,
        }

    def ensure_string(self, value: Any, default: str = "") -> str:
        if isinstance(value, str):
            stripped = value.strip()
            return stripped if stripped else default
        return default

    def ensure_string_array(self, value: Any) -> list[str]:
        if not isinstance(value, list):
            return []

        items: list[str] = []
        for item in value:
            if isinstance(item, str):
                stripped = item.strip()
                if stripped:
                    items.append(stripped)
        return items

    def ensure_enum(self, value: Any, allowed: set[str], default: str) -> str:
        if isinstance(value, str):
            normalized = value.strip().upper()
            if normalized in allowed:
                return normalized
        return default

    def ensure_optional_enum(self, value: Any, allowed: set[str]) -> str | None:
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip().upper()
            if normalized in allowed:
                return normalized
        return None

    def ensure_int(
        self, value: Any, default: int, minimum: int = 0, maximum: int | None = None
    ) -> int:
        try:
            parsed = int(value)
        except (TypeError, ValueError):
            return default
        if parsed < minimum:
            return default
        if maximum is not None and parsed > maximum:
            return maximum
        return parsed

    def ensure_optional_number(self, value: Any) -> float | None:
        if value is None or isinstance(value, bool):
            return None
        try:
            parsed = float(value)
        except (TypeError, ValueError):
            return None
        return parsed if parsed >= 0 else None

    def ensure_currency(self, value: Any) -> str:
        currency = self.ensure_string(value, "USD").upper()
        return currency if len(currency) == 3 and currency.isalpha() else "USD"

    def ensure_bool(self, value: Any, default: bool) -> bool:
        if isinstance(value, bool):
            return value
        return default

    def infer_title(self, prompt: str) -> str:
        normalized = prompt.strip()
        if not normalized:
            return DEFAULT_JOB_OFFER_TITLE

        words = normalized.split()
        snippet = " ".join(words[:6])
        return snippet[:80].strip() or DEFAULT_JOB_OFFER_TITLE

    def infer_skills(self, prompt: str) -> list[str]:
        """Best-effort extraction of skill-like tokens from the raw prompt for the
        fallback path, so an unstructured/offline generation still reflects what the
        recruiter typed instead of pure generic filler."""
        stopwords = {
            "need",
            "needed",
            "hiring",
            "urgent",
            "urgently",
            "remote",
            "onsite",
            "hybrid",
            "full",
            "time",
            "part",
            "job",
            "role",
            "position",
            "for",
            "with",
            "and",
            "the",
            "a",
            "an",
            "to",
            "in",
            "of",
            "we",
            "are",
            "looking",
        }

        skills: list[str] = []
        for raw_word in prompt.split():
            word = raw_word.strip(".,;:!?()[]{}\"'")
            if not word or word.lower() in stopwords:
                continue
            if (word.isupper() and len(word) <= 6) or word[0].isupper():
                skills.append(word)
            if len(skills) >= 10:
                break

        deduped: list[str] = []
        seen: set[str] = set()
        for skill in skills:
            key = skill.lower()
            if key not in seen:
                seen.add(key)
                deduped.append(skill)
        return deduped