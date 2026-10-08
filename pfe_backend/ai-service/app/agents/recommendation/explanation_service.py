"""Explanation Service – generates human-readable recommendation explanations via LLM."""
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.providers.base import AIProvider
from app.schemas.recommendation import CandidateFeatures, JobFeatures
from app.schemas.scoring import UnifiedBreakdownSchema

logger = logging.getLogger("smart-cv-ai-service")


def _pct(value: float | None) -> str:
    return "not evaluated" if value is None else f"{round(value * 100)}%"


def _ge(value: float | None, threshold_pct: float) -> bool:
    """True when `value` (0-1, possibly None) is at least `threshold_pct`."""
    return value is not None and value * 100 >= threshold_pct


def _score_pct(score: float | None) -> str:
    """Formats an already-0-100-scale overall score, or "not evaluated" for None."""
    return "not evaluated" if score is None else f"{round(score)}%"


class RecommendationExplanationService:
    """Generates natural-language explanations for each recommendation.

    Uses the existing AIProvider (Groq / Ollama) when available, with a
    deterministic template-based fallback to guarantee explanations even
    when the LLM is unavailable or fails.
    """

    def __init__(self, provider: AIProvider | None = None) -> None:
        self.provider = provider

    async def explain_jobs_batch(
        self,
        candidate: CandidateFeatures,
        recommendations: list[dict[str, Any]],
        language: str = "en",
    ) -> list[str]:
        """Generate explanations for a batch of job recommendations (candidate → job).

        Parameters
        ----------
        candidate : CandidateFeatures
        recommendations : list[dict]
            Each dict must contain 'job', 'breakdown' and 'overall_score'.
        language : str
        """
        tasks = [
            self._explain_job(candidate, rec, language)
            for rec in recommendations
        ]
        return await asyncio.gather(*tasks)

    async def explain_candidates_batch(
        self,
        job: JobFeatures,
        recommendations: list[dict[str, Any]],
        language: str = "en",
    ) -> list[str]:
        """Generate explanations for a batch of candidate recommendations (job → candidate)."""
        tasks = [
            self._explain_candidate(job, rec, language)
            for rec in recommendations
        ]
        return await asyncio.gather(*tasks)

    # ── Individual explanation generators ─────────────────────────────────

    async def _explain_job(
        self,
        candidate: CandidateFeatures,
        rec: dict[str, Any],
        language: str,
    ) -> str:
        """Generate explanation for why a job is recommended to a candidate."""
        job: JobFeatures = rec["job"]
        breakdown: UnifiedBreakdownSchema = rec["breakdown"]
        score: float | None = rec["overall_score"]

        if self.provider is not None:
            try:
                prompt = self._build_job_prompt(candidate, job, breakdown, score, language)
                result = await asyncio.to_thread(self.provider.generate, prompt, False)
                text = result.strip()
                if text:
                    return text
            except Exception as e:
                logger.warning(f"[RecommendationExplanation] LLM failed for job {job.job_id}: {e}")

        return self._fallback_job_explanation(candidate, job, breakdown, score)

    async def _explain_candidate(
        self,
        job: JobFeatures,
        rec: dict[str, Any],
        language: str,
    ) -> str:
        """Generate explanation for why a candidate is recommended for a job."""
        candidate: CandidateFeatures = rec["candidate"]
        breakdown: UnifiedBreakdownSchema = rec["breakdown"]
        score: float | None = rec["overall_score"]

        if self.provider is not None:
            try:
                prompt = self._build_candidate_prompt(job, candidate, breakdown, score, language)
                result = await asyncio.to_thread(self.provider.generate, prompt, False)
                text = result.strip()
                if text:
                    return text
            except Exception as e:
                logger.warning(f"[RecommendationExplanation] LLM failed for candidate {candidate.candidate_id}: {e}")

        return self._fallback_candidate_explanation(job, candidate, breakdown, score)

    # ── LLM Prompt Builders ───────────────────────────────────────────────

    def _build_job_prompt(
        self,
        candidate: CandidateFeatures,
        job: JobFeatures,
        breakdown: UnifiedBreakdownSchema,
        score: float | None,
        language: str,
    ) -> str:
        target_lang = "French" if language.lower().startswith("fr") else "English"
        return f"""You are a career recommendation assistant for a recruitment platform.

Write a concise, personalised explanation in {target_lang} for why this job is recommended to the candidate.
Use only the facts provided. Be specific about matching skills and experience.

Candidate: {candidate.name}
Skills: {', '.join(candidate.skills[:15])}
Experience: {candidate.experience_years} years
Desired position: {candidate.desired_position}
Location: {candidate.location}

Job: {job.title} at {job.company}
Required skills: {', '.join(job.required_skills[:10])}
Location: {job.location} ({job.workplace_type})
Salary: {job.salary_min or 'N/A'} - {job.salary_max or 'N/A'} {job.currency}

Score breakdown:
- Skills match: {_pct(breakdown.skills)}
- Experience match: {_pct(breakdown.experience)}
- Semantic similarity: {_pct(breakdown.semantic)}
Overall score: {_score_pct(score)}

Format: Start with "This job matches your profile because:" followed by 3-5 bullet points.
Keep it under 150 words. Do not mention internal scores or technical details.
"""

    def _build_candidate_prompt(
        self,
        job: JobFeatures,
        candidate: CandidateFeatures,
        breakdown: UnifiedBreakdownSchema,
        score: float | None,
        language: str,
    ) -> str:
        target_lang = "French" if language.lower().startswith("fr") else "English"
        return f"""You are a recruitment assistant for hiring managers.

Write a concise explanation in {target_lang} for why this candidate is recommended for the job.
Use only the facts provided. Focus on qualification fit.

Job: {job.title} at {job.company}
Required skills: {', '.join(job.required_skills[:10])}
Experience needed: {job.experience_years} years
Location: {job.location}

Candidate: {candidate.name}
Skills: {', '.join(candidate.skills[:15])}
Experience: {candidate.experience_years} years
Education: {candidate.education_level}
Certifications: {', '.join(candidate.certifications[:5])}
Languages: {', '.join(candidate.languages)}
Open to work: {candidate.open_to_work}

Score breakdown:
- Skills match: {_pct(breakdown.skills)}
- Experience match: {_pct(breakdown.experience)}
- Semantic similarity: {_pct(breakdown.semantic)}
- Education match: {_pct(breakdown.education)}
Overall score: {_score_pct(score)}

Format: Start with "This candidate is recommended because:" followed by 3-5 bullet points.
Keep it under 150 words. Do not mention internal scores.
"""

    # ── Fallback template-based explanations ──────────────────────────────

    def _fallback_job_explanation(
        self,
        candidate: CandidateFeatures,
        job: JobFeatures,
        breakdown: UnifiedBreakdownSchema,
        score: float | None,
    ) -> str:
        points: list[str] = []

        # Skills
        matched = {s.lower() for s in candidate.skills} & {s.lower() for s in job.required_skills}
        if matched:
            points.append(f"Your skills match {len(matched)} of {len(job.required_skills)} required skills ({', '.join(list(matched)[:5])})")
        if _ge(breakdown.skills, 70):
            points.append(f"{round((breakdown.skills or 0) * 100)}% skills overlap with job requirements")

        # Experience
        if _ge(breakdown.experience, 80):
            points.append("Your experience level meets or exceeds the requirement")
        elif _ge(breakdown.experience, 50):
            points.append("Your experience is approaching the required level")

        # Semantic
        if _ge(breakdown.semantic, 70):
            points.append("Strong overall profile-to-job alignment")

        if not points:
            points.append(f"Overall compatibility score: {_score_pct(score)}")

        header = "This job matches your profile because:"
        bullets = "\n".join(f"• {p}" for p in points[:5])
        return f"{header}\n{bullets}"

    def _fallback_candidate_explanation(
        self,
        job: JobFeatures,
        candidate: CandidateFeatures,
        breakdown: UnifiedBreakdownSchema,
        score: float | None,
    ) -> str:
        points: list[str] = []

        matched = {s.lower() for s in candidate.skills} & {s.lower() for s in job.required_skills}
        if matched:
            points.append(f"Covers {len(matched)}/{len(job.required_skills)} required skills ({', '.join(list(matched)[:5])})")

        if candidate.experience_years > 0:
            points.append(f"{candidate.experience_years} years of relevant experience")

        if candidate.certifications:
            points.append(f"Holds certifications: {', '.join(candidate.certifications[:3])}")

        if _ge(breakdown.education, 80):
            points.append("Education level meets the requirement")

        if candidate.open_to_work:
            points.append("Currently open to work and available")

        if _ge(breakdown.semantic, 70):
            points.append("High semantic similarity between profile and role")

        if not points:
            points.append(f"Overall fit score: {_score_pct(score)}")

        header = "This candidate is recommended because:"
        bullets = "\n".join(f"• {p}" for p in points[:5])
        return f"{header}\n{bullets}"
