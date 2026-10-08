"""Hybrid Search Service – combines dense vector search with metadata filtering."""
from __future__ import annotations

import logging
from typing import Any

from app.agents.recommendation.embedding_service import RecommendationEmbeddingService
from app.config.settings import Settings
from app.schemas.recommendation import (
    RetrievedCandidate,
    RetrievedJob,
)

logger = logging.getLogger("smart-cv-ai-service")


class HybridSearchService:
    """Performs hybrid retrieval by combining Qdrant dense vector search
    with metadata-based pre-filtering.  Returns the Top-K candidates or jobs
    to be further re-ranked by the cross-encoder."""

    def __init__(self, settings: Settings, embedding_service: RecommendationEmbeddingService) -> None:
        self.settings = settings
        self.embedding_service = embedding_service

    def search_jobs_for_candidate(
        self,
        candidate_vector: list[float],
        top_k: int | None = None,
    ) -> list[RetrievedJob]:
        """Retrieve the most semantically similar job offers for a candidate,
        optionally filtered by metadata (workplace type, status, etc.)."""

        limit = top_k or self.settings.rec_retrieval_top_k

        # Build soft metadata filters
        filters = self._build_job_filters()

        # First try with filters
        results = self.embedding_service.search_jobs(
            query_vector=candidate_vector,
            limit=limit,
            filter_conditions=filters if filters else None,
        )

        # If insufficient results, retry without filters
        if len(results) < limit:
            logger.info(
                f"[HybridSearch] Only {len(results)} jobs found with filters, "
                f"retrying without filters (target: {limit})"
            )
            results = self.embedding_service.search_jobs(
                query_vector=candidate_vector,
                limit=limit,
                filter_conditions=None,
            )

        retrieved: list[RetrievedJob] = []
        for hit in results:
            payload = hit.get("payload", {})
            retrieved.append(
                RetrievedJob(
                    job_id=payload.get("entity_id", ""),
                    vector_score=round(hit.get("score", 0.0) * 100, 2),
                    payload=payload,
                )
            )
        return retrieved

    def search_candidates_for_job(
        self,
        job_vector: list[float],
        top_k: int | None = None,
    ) -> list[RetrievedCandidate]:
        """Retrieve the most semantically similar candidates for a job offer,
        optionally filtered by metadata (open_to_work, etc.)."""

        limit = top_k or self.settings.rec_retrieval_top_k

        # Build soft metadata filters
        filters = self._build_candidate_filters()

        results = self.embedding_service.search_candidates(
            query_vector=job_vector,
            limit=limit,
            filter_conditions=filters if filters else None,
        )

        # Fallback without filters if insufficient
        if len(results) < limit:
            logger.info(
                f"[HybridSearch] Only {len(results)} candidates found with filters, "
                f"retrying without filters (target: {limit})"
            )
            results = self.embedding_service.search_candidates(
                query_vector=job_vector,
                limit=limit,
                filter_conditions=None,
            )

        retrieved: list[RetrievedCandidate] = []
        for hit in results:
            payload = hit.get("payload", {})
            retrieved.append(
                RetrievedCandidate(
                    candidate_id=payload.get("entity_id", ""),
                    vector_score=round(hit.get("score", 0.0) * 100, 2),
                    payload=payload,
                )
            )
        return retrieved

    # ── Private filter builders ───────────────────────────────────────────

    def _build_job_filters(self) -> dict[str, Any]:
        """Build Qdrant filter conditions to pre-filter job offers.

        Uses soft filters only – we never want to exclude a great match
        just because a single metadata field doesn't align.  The
        cross-encoder and business scoring handle fine-grained ranking.
        """
        filters: dict[str, Any] = {}
        # Only show published jobs
        filters["status"] = "PUBLISHED"
        return filters

    def _build_candidate_filters(self) -> dict[str, Any]:
        """Build Qdrant filter conditions to pre-filter candidates."""
        filters: dict[str, Any] = {}
        # Prefer candidates marked as open to work
        filters["open_to_work"] = True
        return filters
