"""Matching orchestration: thin wrapper delegating scoring to the unified
scoring engine (`app/agents/scoring/unified_engine.py`), shared verbatim with
the recommendation pipeline. This module now only adapts the unified engine's
output into the matching-specific schemas (breakdown/strengths/gaps) and
keeps the LightGBM ranking/SHAP explanation layer, which stays matching-only.
"""
from __future__ import annotations

from dataclasses import dataclass

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.ranking.explain import explain_score
from app.agents.matching.ranking.features import assemble_feature_vector
from app.agents.matching.ranking.lgbm_ranker import LgbmRankerWrapper
from app.agents.matching.rule_based.esco_taxonomy import load_esco_taxonomy
from app.agents.matching.semantic.embedding_provider import SectionEmbeddingProvider
from app.agents.matching.semantic.qdrant_store import SectionVectorStore
from app.agents.scoring.unified_engine import UnifiedScore, compute_unified_score
from app.config.settings import Settings
from app.schemas.matching import CandidateProfileSchema, ExplanationFeatureSchema, JobOfferSchema
from app.schemas.scoring import UnifiedBreakdownSchema


@dataclass(slots=True)
class MatchComputation:
    breakdown: UnifiedBreakdownSchema
    unavailable_criteria: list[str]
    unified: UnifiedScore
    final_score_0_100: int | None
    scoring_method: str
    matched_skills: list[str]
    missing_skills: list[str]
    strengths: list[str]
    gaps: list[str]
    shap_explanation: list[dict]


class MatchingAgent:
    def __init__(self, settings: Settings, embedding_agent=None) -> None:
        self.settings = settings
        self.normalizer = NormalizationAgent(settings)
        self.embedding_agent = embedding_agent  # kept for the shared multilingual-e5-small model instance
        self.esco = load_esco_taxonomy(settings)
        self.lgbm_ranker = LgbmRankerWrapper(settings)
        # Per-section Qdrant storage is intentionally disabled for now: nothing
        # reads these vectors back (compute_semantic_score always recomputes
        # cosine similarity from freshly-encoded in-process vectors), so writing
        # them on every match was pure wasted I/O. Re-enable by constructing a
        # SectionVectorStore here once something (e.g. ANN-based candidate
        # shortlisting) actually queries `cv_sections`/`job_sections`.
        self._section_store: SectionVectorStore | None = None

    @property
    def embedding_provider(self) -> SectionEmbeddingProvider:
        # Re-read `embedding_agent.model` on every access instead of caching it
        # once at construction time — if the model failed to load at startup
        # but later loads successfully (e.g. a retried/replaced EmbeddingAgent),
        # semantic scoring should pick that up instead of staying permanently
        # disabled for the process lifetime.
        return SectionEmbeddingProvider(self.embedding_agent.model if self.embedding_agent else None)

    def compute(
        self,
        candidate: CandidateProfileSchema,
        job_offer: JobOfferSchema,
        db_mappings: dict[str, str] | None = None,
    ) -> MatchComputation:
        unified = compute_unified_score(
            candidate,
            job_offer,
            self.settings,
            self.normalizer,
            self.esco,
            self.embedding_provider,
            self._section_store,
            db_mappings,
        )

        final_score_0_100, scoring_method, shap_explanation = self._score_and_explain(unified)

        strengths = self._build_strengths(unified)
        gaps = self._build_gaps(unified)

        return MatchComputation(
            breakdown=unified.breakdown,
            unavailable_criteria=unified.unavailable_criteria,
            unified=unified,
            final_score_0_100=final_score_0_100,
            scoring_method=scoring_method,
            matched_skills=unified.matched_skills,
            missing_skills=unified.missing_skills,
            strengths=strengths,
            gaps=gaps,
            shap_explanation=shap_explanation,
        )

    @staticmethod
    def to_explanation_schema(shap_explanation: list[dict]) -> list[ExplanationFeatureSchema]:
        return [ExplanationFeatureSchema(**item) for item in shap_explanation]

    def _score_and_explain(self, unified: UnifiedScore) -> tuple[int | None, str, list[dict]]:
        """Run the LightGBM ranking/SHAP explanation layer, or fall back to
        "no signal" when the unified score has no usable overall value."""
        if unified.overall is None:
            return None, "unified_no_signal", []

        features = assemble_feature_vector(unified)
        final = self.lgbm_ranker.predict(unified, features)
        shap_explanation = explain_score(features, self.lgbm_ranker, self.settings)
        return final.score_0_100, final.method, shap_explanation

    def _has_high_semantic_similarity(self, unified: UnifiedScore) -> bool:
        semantic = unified.semantic_score
        return semantic is not None and semantic.available and (semantic.aggregate or 0) >= 0.7

    def _build_strengths(self, unified: UnifiedScore) -> list[str]:
        strengths: list[str] = []
        skills_score = unified.per_criterion["skills"].score
        experience_score = unified.per_criterion["experience"].score
        if skills_score is not None and skills_score >= 0.8:
            strengths.append("Strong required skill alignment")
        if experience_score is not None and experience_score >= 0.8:
            strengths.append("Relevant experience level")
        if self._has_high_semantic_similarity(unified):
            strengths.append("High semantic similarity between profile and role")
        if unified.matched_skills:
            strengths.append(f"Matched core skills: {', '.join(unified.matched_skills[:5])}")
        return strengths

    def _build_gaps(self, unified: UnifiedScore) -> list[str]:
        gaps: list[str] = []
        if unified.missing_skills:
            gaps.append(f"Missing required skills: {', '.join(unified.missing_skills[:5])}")
        education_score = unified.per_criterion["education"].score
        if education_score is not None and education_score < 0.6:
            gaps.append("Education level is below the preferred threshold")
        projects_score = unified.per_criterion["projects"].score
        if projects_score is not None and projects_score < 0.5:
            gaps.append("Limited demonstrated project experience with the required tech stack")
        if unified.per_criterion["certifications"].missing:
            gaps.append(f"Missing certifications: {', '.join(unified.per_criterion['certifications'].missing[:5])}")
        return gaps
