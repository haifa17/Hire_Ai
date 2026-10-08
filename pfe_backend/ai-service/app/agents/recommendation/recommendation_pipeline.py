"""Recommendation Pipeline – orchestrates the full hybrid recommendation flow."""
from __future__ import annotations

import logging
import time
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import load_esco_taxonomy
from app.agents.matching.semantic.embedding_provider import SectionEmbeddingProvider
from app.agents.matching.semantic.engine import _cv_sections, _job_sections
from app.agents.recommendation.embedding_service import RecommendationEmbeddingService
from app.agents.recommendation.explanation_service import RecommendationExplanationService
from app.agents.recommendation.hybrid_search_service import HybridSearchService
from app.agents.recommendation.job_analyzer import JobAnalyzer
from app.agents.recommendation.profile_analyzer import ProfileAnalyzer
from app.agents.scoring import recommendation_adapter
from app.agents.scoring.unified_engine import compute_unified_score
from app.config.settings import Settings
from app.db.models import Recommendation, RecommendationLog
from app.db.session import AsyncSessionLocal
from app.providers.base import AIProvider
from app.schemas.recommendation import RecommendationItem, RecommendationResponse

logger = logging.getLogger("smart-cv-ai-service")


class RecommendationPipeline:
    """End-to-end recommendation orchestrator.

    Pipeline:
        1. Analyse source entity (candidate / job)
        2. Generate embedding
        3. Hybrid search in Qdrant (Top K) — presells the candidate pool only,
           does not itself contribute to the final score (plan §1/§7).
        4. Fine scoring via the unified engine (same 7-criterion scorer as
           the matching pipeline), reconstructing rich schemas from the
           Qdrant snapshot payload via `recommendation_adapter`.
        5. Final ranking → Top N
        6. LLM explanation generation
        7. Persist to PostgreSQL
    """

    def __init__(self, settings: Settings, provider: AIProvider | None = None) -> None:
        self.settings = settings
        self.profile_analyzer = ProfileAnalyzer(settings)
        self.job_analyzer = JobAnalyzer(settings)
        self.embedding_service = RecommendationEmbeddingService(settings)
        self.hybrid_search = HybridSearchService(settings, self.embedding_service)
        self.explainer = RecommendationExplanationService(provider)
        self.normalizer = NormalizationAgent(settings)
        self.esco = load_esco_taxonomy(settings)

    @property
    def _embedding_provider(self) -> SectionEmbeddingProvider:
        # Reused every call rather than cached once, mirroring
        # `MatchingAgent.embedding_provider` — picks up a model that finishes
        # loading after pipeline construction instead of staying disabled.
        return SectionEmbeddingProvider(self.embedding_service.model)

    # ══════════════════════════════════════════════════════════════════════
    #  Job Recommendations (for a candidate)
    # ══════════════════════════════════════════════════════════════════════

    async def recommend_jobs_for_candidate(
        self,
        candidate_id: str,
        candidate_profile: dict[str, Any],
        top_k: int = 10,
        language: str = "en",
        trigger: str = "manual_refresh",
    ) -> RecommendationResponse:
        """Compute Top-K job recommendations for a candidate."""
        # Hard cap: a candidate is never shown more than 5 recommended jobs,
        # regardless of what the caller requests.
        top_k = min(top_k, 5)
        start = time.monotonic()
        request_id = str(uuid.uuid4())

        # 1. Analyse candidate profile
        candidate_features = self.profile_analyzer.analyze(candidate_id, candidate_profile)
        logger.info(f"[RecPipeline] Analysed candidate {candidate_id}: {len(candidate_features.skills)} skills, {candidate_features.experience_years}y exp")
        candidate_schema = recommendation_adapter.candidate_profile_from_features(candidate_features)

        # 2. Generate candidate embedding
        candidate_vector = self.embedding_service.encode(candidate_features.summary_text)
        # Pre-encode the candidate's section vectors once — reused for every
        # retrieved job's fine-scoring pass below instead of re-embedding the
        # same CV text per job, which was the dominant cost of this endpoint.
        candidate_cv_vectors = self._embedding_provider.encode_sections(_cv_sections(candidate_schema))

        # 3. Hybrid search: retrieve Top K jobs (presselection only)
        retrieved_jobs = self.hybrid_search.search_jobs_for_candidate(
            candidate_vector, self.settings.rec_retrieval_top_k,
        )
        logger.info(f"[RecPipeline] Retrieved {len(retrieved_jobs)} jobs from Qdrant")

        if not retrieved_jobs:
            duration_ms = int((time.monotonic() - start) * 1000)
            await self._log_execution(candidate_id, "candidate", trigger, 0, duration_ms, "completed")
            return RecommendationResponse(
                request_id=request_id,
                source_id=candidate_id,
                source_type="candidate",
                recommendations=[],
                computed_at=datetime.now(timezone.utc).isoformat(),
            )

        # 4. Fine scoring via the unified engine
        scored_items: list[dict[str, Any]] = []
        for rj in retrieved_jobs:
            job_schema = recommendation_adapter.job_offer_from_payload(rj.job_id, rj.payload)
            unified = compute_unified_score(
                candidate_schema, job_schema, self.settings, self.normalizer, self.esco, self._embedding_provider,
                candidate_cv_vectors=candidate_cv_vectors,
            )
            overall = round(unified.overall * 100, 2) if unified.overall is not None else None
            scored_items.append({
                "job_id": rj.job_id,
                "job_features": self._job_features_from_payload(rj.job_id, rj.payload),
                "overall_score": overall,
                "breakdown": unified.breakdown,
                "unavailable_criteria": unified.unavailable_criteria,
                "payload": rj.payload,
                # vector_score logged for diagnostics only — never enters the score.
                "vector_score": rj.vector_score,
            })

        # 5. Final ranking → Top N (unscored items sort last, never crash)
        scored_items.sort(key=lambda x: (x["overall_score"] is not None, x["overall_score"] or 0.0), reverse=True)
        top_items = scored_items[:top_k]

        # 6. Generate explanations
        explanation_input = [
            {"job": item["job_features"], "breakdown": item["breakdown"], "overall_score": item["overall_score"]}
            for item in top_items
        ]
        explanations = await self.explainer.explain_jobs_batch(candidate_features, explanation_input, language)

        # 7. Build response
        recommendations: list[RecommendationItem] = []
        for rank, (item, explanation) in enumerate(zip(top_items, explanations), start=1):
            recommendations.append(
                RecommendationItem(
                    rank=rank,
                    entity_id=item["job_id"],
                    entity_type="job",
                    overall_score=item["overall_score"],
                    breakdown=item["breakdown"],
                    unavailable_criteria=item["unavailable_criteria"],
                    explanation=explanation,
                    metadata=self._sanitise_metadata(item["payload"]),
                )
            )

        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(f"[RecPipeline] Job recommendations for {candidate_id} completed in {duration_ms}ms")

        # 8. Persist
        await self._persist_recommendations(
            source_id=candidate_id,
            source_type="candidate",
            recommendations=recommendations,
        )
        await self._log_execution(candidate_id, "candidate", trigger, len(retrieved_jobs), duration_ms, "completed")

        return RecommendationResponse(
            request_id=request_id,
            source_id=candidate_id,
            source_type="candidate",
            recommendations=recommendations,
            computed_at=datetime.now(timezone.utc).isoformat(),
        )

    # ══════════════════════════════════════════════════════════════════════
    #  Candidate Recommendations (for a job offer)
    # ══════════════════════════════════════════════════════════════════════

    async def recommend_candidates_for_job(
        self,
        job_id: str,
        job_offer: dict[str, Any],
        top_k: int = 10,
        language: str = "en",
        trigger: str = "manual_refresh",
    ) -> RecommendationResponse:
        """Compute Top-K candidate recommendations for a job offer."""
        start = time.monotonic()
        request_id = str(uuid.uuid4())

        # 1. Analyse job offer
        job_features = self.job_analyzer.analyze(job_id, job_offer)
        logger.info(f"[RecPipeline] Analysed job {job_id}: '{job_features.title}', {len(job_features.required_skills)} required skills")
        job_schema = recommendation_adapter.job_offer_from_features(job_features)

        # 2. Generate job embedding
        job_vector = self.embedding_service.encode(job_features.summary_text)
        # Pre-encode the job's section vectors once — reused for every
        # retrieved candidate's fine-scoring pass below instead of
        # re-embedding the same job text per candidate.
        job_offer_vectors = self._embedding_provider.encode_sections(_job_sections(job_schema))

        # 3. Hybrid search: retrieve Top K candidates (presselection only)
        retrieved_candidates = self.hybrid_search.search_candidates_for_job(
            job_vector, self.settings.rec_retrieval_top_k,
        )
        logger.info(f"[RecPipeline] Retrieved {len(retrieved_candidates)} candidates from Qdrant")

        if not retrieved_candidates:
            duration_ms = int((time.monotonic() - start) * 1000)
            await self._log_execution(job_id, "job", trigger, 0, duration_ms, "completed")
            return RecommendationResponse(
                request_id=request_id,
                source_id=job_id,
                source_type="job",
                recommendations=[],
                computed_at=datetime.now(timezone.utc).isoformat(),
            )

        # 4. Fine scoring via the unified engine
        scored_items: list[dict[str, Any]] = []
        for rc in retrieved_candidates:
            candidate_schema = recommendation_adapter.candidate_profile_from_payload(rc.candidate_id, rc.payload)
            unified = compute_unified_score(
                candidate_schema, job_schema, self.settings, self.normalizer, self.esco, self._embedding_provider,
                job_offer_vectors=job_offer_vectors,
            )
            overall = round(unified.overall * 100, 2) if unified.overall is not None else None
            scored_items.append({
                "candidate_id": rc.candidate_id,
                "candidate_features": self._candidate_features_from_payload(rc.candidate_id, rc.payload),
                "overall_score": overall,
                "breakdown": unified.breakdown,
                "unavailable_criteria": unified.unavailable_criteria,
                "payload": rc.payload,
                "vector_score": rc.vector_score,
            })

        # 5. Final ranking → Top N
        scored_items.sort(key=lambda x: (x["overall_score"] is not None, x["overall_score"] or 0.0), reverse=True)
        top_items = scored_items[:top_k]

        # 6. Generate explanations
        explanation_input = [
            {"candidate": item["candidate_features"], "breakdown": item["breakdown"], "overall_score": item["overall_score"]}
            for item in top_items
        ]
        explanations = await self.explainer.explain_candidates_batch(job_features, explanation_input, language)

        # 7. Build response
        recommendations: list[RecommendationItem] = []
        for rank, (item, explanation) in enumerate(zip(top_items, explanations), start=1):
            recommendations.append(
                RecommendationItem(
                    rank=rank,
                    entity_id=item["candidate_id"],
                    entity_type="candidate",
                    overall_score=item["overall_score"],
                    breakdown=item["breakdown"],
                    unavailable_criteria=item["unavailable_criteria"],
                    explanation=explanation,
                    metadata=self._sanitise_metadata(item["payload"]),
                )
            )

        duration_ms = int((time.monotonic() - start) * 1000)
        logger.info(f"[RecPipeline] Candidate recommendations for job {job_id} completed in {duration_ms}ms")

        await self._persist_recommendations(
            source_id=job_id,
            source_type="job",
            recommendations=recommendations,
        )
        await self._log_execution(job_id, "job", trigger, len(retrieved_candidates), duration_ms, "completed")

        return RecommendationResponse(
            request_id=request_id,
            source_id=job_id,
            source_type="job",
            recommendations=recommendations,
            computed_at=datetime.now(timezone.utc).isoformat(),
        )

    # ══════════════════════════════════════════════════════════════════════
    #  Indexing helpers (for batch / incremental indexing)
    # ══════════════════════════════════════════════════════════════════════

    def index_candidate(self, candidate_id: str, profile: dict[str, Any]) -> None:
        """Index a single candidate into the recommendation_candidates collection."""
        features = self.profile_analyzer.analyze(candidate_id, profile)
        vector = self.embedding_service.encode(features.summary_text)
        self.embedding_service.upsert_candidate(
            candidate_id,
            vector,
            {
                "name": features.name,
                "skills": features.skills,
                "experience_years": features.experience_years,
                "education_rank": features.education_rank,
                "education_level": features.education_level,
                "location": features.location,
                "desired_salary": features.desired_salary or 0,
                "languages": features.languages,
                "certifications": features.certifications,
                "desired_position": features.desired_position,
                "open_to_work": features.open_to_work,
                "summary_text": features.summary_text,
                # ── Structured snapshot (plan §6/§8) ──────────────────────
                "experiences_snapshot": features.experiences_snapshot,
                "education_snapshot": features.education_snapshot,
            },
        )

    def index_job(self, job_id: str, job_offer: dict[str, Any]) -> None:
        """Index a single job offer into the recommendation_jobs collection."""
        features = self.job_analyzer.analyze(job_id, job_offer)
        vector = self.embedding_service.encode(features.summary_text)
        self.embedding_service.upsert_job(
            job_id,
            vector,
            {
                "title": features.title,
                "company": features.company,
                "industry": features.industry,
                "required_skills": features.required_skills,
                "preferred_skills": features.preferred_skills,
                "experience_years": features.experience_years,
                "education_rank": features.education_rank,
                "education_level": features.education_level,
                "location": features.location,
                "country": features.country,
                "city": features.city,
                "salary_min": features.salary_min or 0,
                "salary_max": features.salary_max or 0,
                "currency": features.currency,
                "employment_type": features.employment_type,
                "workplace_type": features.workplace_type,
                "languages": features.languages,
                "status": job_offer.get("status", "PUBLISHED"),
                "summary_text": features.summary_text,
                # ── Structured snapshot (plan §6/§8) ──────────────────────
                "required_certifications": features.required_certifications,
                "nice_to_have_skills": features.nice_to_have_skills,
            },
        )

    # ── Private helpers ───────────────────────────────────────────────────

    def _job_features_from_payload(self, job_id: str, payload: dict[str, Any]):
        """Reconstruct minimal JobFeatures from a Qdrant payload (for explanations only)."""
        from app.schemas.recommendation import JobFeatures

        return JobFeatures(
            job_id=job_id,
            title=payload.get("title", ""),
            company=payload.get("company", ""),
            industry=payload.get("industry", ""),
            required_skills=payload.get("required_skills", []),
            preferred_skills=payload.get("preferred_skills", []),
            experience_years=float(payload.get("experience_years", 0)),
            education_rank=int(payload.get("education_rank", 0)),
            location=payload.get("location", ""),
            country=payload.get("country", ""),
            city=payload.get("city", ""),
            salary_min=payload.get("salary_min"),
            salary_max=payload.get("salary_max"),
            currency=payload.get("currency", "USD"),
            employment_type=payload.get("employment_type", ""),
            workplace_type=payload.get("workplace_type", ""),
            languages=payload.get("languages", []),
            summary_text=payload.get("summary_text", ""),
        )

    def _candidate_features_from_payload(self, cand_id: str, payload: dict[str, Any]):
        """Reconstruct minimal CandidateFeatures from a Qdrant payload (for explanations only)."""
        from app.schemas.recommendation import CandidateFeatures

        return CandidateFeatures(
            candidate_id=cand_id,
            name=payload.get("name", ""),
            skills=payload.get("skills", []),
            experience_years=float(payload.get("experience_years", 0)),
            education_level=payload.get("education_level", ""),
            education_rank=int(payload.get("education_rank", 0)),
            location=payload.get("location", ""),
            desired_salary=payload.get("desired_salary"),
            languages=payload.get("languages", []),
            certifications=payload.get("certifications", []),
            desired_position=payload.get("desired_position", ""),
            open_to_work=bool(payload.get("open_to_work", False)),
            summary_text=payload.get("summary_text", ""),
        )

    def _sanitise_metadata(self, payload: dict[str, Any]) -> dict[str, Any]:
        """Remove internal fields from metadata before sending to the client."""
        exclude = {"indexed_at", "entity_type", "summary_text", "experiences_snapshot", "education_snapshot"}
        return {k: v for k, v in payload.items() if k not in exclude}

    async def _persist_recommendations(
        self,
        source_id: str,
        source_type: str,
        recommendations: list[RecommendationItem],
    ) -> None:
        """Persist recommendation results to PostgreSQL."""
        try:
            async with AsyncSessionLocal() as db:
                # Deactivate old recommendations for this source
                from sqlalchemy import update

                await db.execute(
                    update(Recommendation)
                    .where(
                        Recommendation.source_id == uuid.UUID(source_id),
                        Recommendation.source_type == source_type,
                        Recommendation.is_active == True,
                    )
                    .values(is_active=False)
                )

                expires_at = datetime.now(timezone.utc) + timedelta(hours=self.settings.rec_cache_ttl_hours)

                for rec in recommendations:
                    try:
                        target_uuid = uuid.UUID(rec.entity_id)
                    except (TypeError, ValueError):
                        continue

                    row = Recommendation(
                        source_id=uuid.UUID(source_id),
                        source_type=source_type,
                        target_id=target_uuid,
                        target_type=rec.entity_type,
                        rank=rec.rank,
                        overall_score=rec.overall_score,
                        score_breakdown=rec.breakdown.model_dump(),
                        explanation=rec.explanation,
                        metadata_payload=rec.metadata,
                        is_active=True,
                        expires_at=expires_at,
                    )
                    db.add(row)

                await db.commit()
                logger.info(f"[RecPipeline] Persisted {len(recommendations)} recommendations for {source_type}:{source_id}")
        except Exception as e:
            logger.exception(f"[RecPipeline] Failed to persist recommendations: {e}")

    async def _log_execution(
        self,
        source_id: str,
        source_type: str,
        trigger: str,
        items_searched: int,
        duration_ms: int,
        status: str,
        error_message: str | None = None,
    ) -> None:
        """Log a recommendation pipeline execution."""
        try:
            async with AsyncSessionLocal() as db:
                log = RecommendationLog(
                    source_id=uuid.UUID(source_id),
                    source_type=source_type,
                    trigger=trigger,
                    items_searched=items_searched,
                    duration_ms=duration_ms,
                    status=status,
                    error_message=error_message,
                )
                db.add(log)
                await db.commit()
        except Exception as e:
            logger.exception(f"[RecPipeline] Failed to log execution: {e}")
