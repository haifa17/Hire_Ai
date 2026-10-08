from __future__ import annotations

import asyncio
import logging

from app.providers.base import AIProvider
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from app.schemas.scoring import UnifiedBreakdownSchema

logger = logging.getLogger("smart-cv-ai-service")


def _pct(value: float | None) -> str:
    """Formats a 0-1 unified criterion score as a percentage, or a
    "not evaluated" marker when the criterion was unavailable (`None`)."""
    if value is None:
        return "not evaluated"
    return f"{round(value * 100)}%"


class ExplainabilityAgent:
    def __init__(self, provider: AIProvider | None = None) -> None:
        self.provider = provider

    async def explain(
        self,
        candidate: CandidateProfileSchema,
        job_offer: JobOfferSchema,
        breakdown: UnifiedBreakdownSchema,
        strengths: list[str],
        gaps: list[str],
        matched_skills: list[str],
        missing_skills: list[str],
        language: str,
        shap_explanation: list[dict] | None = None,
    ) -> str:
        shap_explanation = shap_explanation or []

        if self.provider is None:
            return self._fallback(breakdown, strengths, gaps, matched_skills, missing_skills, language)

        prompt = self._build_prompt(candidate, job_offer, breakdown, strengths, gaps, matched_skills, missing_skills, language, shap_explanation)
        try:
            generated = await asyncio.to_thread(self.provider.generate, prompt, json_mode=False)
            text = generated.strip()
            if not text:
                logger.warning("Explainability provider returned an empty response; using deterministic fallback.")
                return self._fallback(breakdown, strengths, gaps, matched_skills, missing_skills, language)
            return text
        except Exception as e:
            logger.warning(f"Explainability generation failed, using deterministic fallback: {e}")
            return self._fallback(breakdown, strengths, gaps, matched_skills, missing_skills, language)

    def _build_prompt(
        self,
        candidate: CandidateProfileSchema,
        job_offer: JobOfferSchema,
        breakdown: UnifiedBreakdownSchema,
        strengths: list[str],
        gaps: list[str],
        matched_skills: list[str],
        missing_skills: list[str],
        language: str,
        shap_explanation: list[dict],
    ) -> str:
        target_language = "French" if language.lower().startswith("fr") else "English"

        # Send only what the explanation actually needs — never the candidate's
        # name/email/phone/location or the raw CV/job text. Sending the full
        # profile (as before) leaked PII to third-party LLM providers for no
        # benefit, and ballooned prompt size/cost with rawText content the
        # model doesn't need to justify a score it didn't compute itself.
        candidate_summary = self._summarize_candidate(candidate)
        job_summary = self._summarize_job(job_offer)
        top_drivers = self._format_drivers(shap_explanation)

        return f"""
You are an HR matching explanation assistant. The match score below was already
computed by a deterministic scoring pipeline (rule-based skill/experience/education
matching + semantic similarity) — your job is only to explain it in plain language,
not to invent a new judgment.

Write a factual, concise explanation in {target_language}.
Only use the information given below. Do not mention or infer protected
characteristics (age, gender, ethnicity, religion, nationality) even if you
could guess them from job titles or dates.

Candidate profile (anonymized): {candidate_summary}
Job requirements: {job_summary}
Score breakdown (0-100 each): {breakdown.model_dump_json()}
Top factors driving this score: {top_drivers if top_drivers else "not available"}
Matched skills: {matched_skills}
Missing skills: {missing_skills}
Precomputed strengths: {strengths}
Precomputed gaps: {gaps}

Return a short paragraph plus 3 bullet points: strengths, gaps, and a concrete next step for the candidate.
""".strip()

    def _summarize_candidate(self, candidate: CandidateProfileSchema) -> str:
        best_education = max((edu.degree for edu in candidate.education if edu.degree), default="unspecified", key=len)
        return (
            f"{candidate.totalExperienceYears} years of experience; "
            f"skills: {', '.join(candidate.skillsRaw[:20]) or 'none listed'}; "
            f"education: {best_education}; "
            f"certifications: {', '.join(candidate.certifications[:10]) or 'none listed'}; "
            f"languages: {', '.join(lang.language for lang in candidate.languages if lang.language) or 'unspecified'}"
        )

    def _summarize_job(self, job_offer: JobOfferSchema) -> str:
        return (
            f"title: {job_offer.title or 'unspecified'}; "
            f"required experience: {job_offer.requiredExperienceYears} years; "
            f"required skills: {', '.join(job_offer.requiredSkillsRaw[:20]) or 'none listed'}; "
            f"nice-to-have skills: {', '.join(job_offer.niceToHaveSkillsRaw[:10]) or 'none listed'}; "
            f"education level: {job_offer.educationLevel or 'unspecified'}"
        )

    def _format_drivers(self, shap_explanation: list[dict]) -> str:
        top = sorted(shap_explanation, key=lambda d: abs(d.get("contribution", 0)), reverse=True)[:5]
        return "; ".join(
            f"{d.get('feature')} ({'+' if d.get('contribution', 0) >= 0 else ''}{d.get('contribution', 0):.2f})"
            for d in top
        )

    def _fallback(
        self,
        breakdown: UnifiedBreakdownSchema,
        strengths: list[str],
        gaps: list[str],
        matched_skills: list[str],
        missing_skills: list[str],
        language: str,
    ) -> str:
        """Deterministic, template-based explanation used when no LLM provider
        is configured or the LLM call fails — covers every breakdown criterion
        (not just skills/experience) and is bilingual, matching the LLM path."""
        if language.lower().startswith("fr"):
            return self._fallback_fr(breakdown, strengths, gaps, matched_skills, missing_skills)
        return self._fallback_en(breakdown, strengths, gaps, matched_skills, missing_skills)

    def _fallback_en(self, breakdown, strengths, gaps, matched_skills, missing_skills) -> str:
        parts = [
            f"Required skills match: {_pct(breakdown.skills)}, experience relevance: {_pct(breakdown.experience)}, "
            f"education fit: {_pct(breakdown.education)}, semantic similarity: {_pct(breakdown.semantic)}.",
            f"Matched skills: {', '.join(matched_skills[:6]) if matched_skills else 'none'}.",
        ]
        if strengths:
            parts.append("Strengths: " + "; ".join(strengths[:3]) + ".")
        if gaps:
            parts.append("Gaps: " + "; ".join(gaps[:3]) + ".")
        if missing_skills:
            parts.append("Missing skills: " + ", ".join(missing_skills[:6]) + ".")
        parts.append("Next step: address the missing skills above or highlight equivalent experience in the application.")
        return " ".join(parts)

    def _fallback_fr(self, breakdown, strengths, gaps, matched_skills, missing_skills) -> str:
        parts = [
            f"Correspondance des compétences requises : {_pct(breakdown.skills)}, pertinence de l'expérience : {_pct(breakdown.experience)}, "
            f"adéquation de la formation : {_pct(breakdown.education)}, similarité sémantique : {_pct(breakdown.semantic)}.",
            f"Compétences correspondantes : {', '.join(matched_skills[:6]) if matched_skills else 'aucune'}.",
        ]
        if strengths:
            parts.append("Points forts : " + "; ".join(strengths[:3]) + ".")
        if gaps:
            parts.append("Points à améliorer : " + "; ".join(gaps[:3]) + ".")
        if missing_skills:
            parts.append("Compétences manquantes : " + ", ".join(missing_skills[:6]) + ".")
        parts.append("Prochaine étape : combler les compétences manquantes ci-dessus ou mettre en avant une expérience équivalente dans la candidature.")
        return " ".join(parts)
