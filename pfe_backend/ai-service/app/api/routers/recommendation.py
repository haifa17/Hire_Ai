"""Recommendation API Router – FastAPI endpoints for the recommendation system."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends

from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline
from app.config.settings import Settings, get_settings
from app.core.responses import success_response
from app.db.models import Recommendation
from app.db.session import AsyncSessionLocal
from app.providers.base import AIProvider
from app.providers.factory import get_provider
from app.schemas.recommendation import (
    RecommendCandidatesRequest,
    RecommendJobsRequest,
    RecommendationItem,
    RecommendationResponse,
    RecommendationScoreBreakdown,
)

router = APIRouter()


# ── Job recommendations (for candidates) ─────────────────────────────────

@router.post("/api/ai/recommendations/jobs")
async def recommend_jobs(
    req: RecommendJobsRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    """Compute Top-K job recommendations for a candidate."""
    pipeline = RecommendationPipeline(settings, provider)
    result = await pipeline.recommend_jobs_for_candidate(
        candidate_id=req.candidate_id,
        candidate_profile=req.candidate_profile,
        top_k=req.top_k,
        language=req.language,
        trigger="manual_refresh",
    )
    return success_response(
        result.model_dump(),
        "Job recommendations computed successfully",
    )


@router.post("/api/ai/recommendations/jobs/refresh")
async def refresh_job_recommendations(
    req: RecommendJobsRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    """Force-recompute job recommendations for a candidate."""
    pipeline = RecommendationPipeline(settings, provider)
    result = await pipeline.recommend_jobs_for_candidate(
        candidate_id=req.candidate_id,
        candidate_profile=req.candidate_profile,
        top_k=req.top_k,
        language=req.language,
        trigger="manual_refresh",
    )
    return success_response(
        result.model_dump(),
        "Job recommendations refreshed successfully",
    )


@router.get("/api/ai/recommendations/jobs/{candidate_id}")
async def get_cached_job_recommendations(
    candidate_id: str,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Retrieve cached job recommendations for a candidate."""
    try:
        recommendations = await _get_cached_recommendations(candidate_id, "candidate")
        return success_response(
            {
                "source_id": candidate_id,
                "source_type": "candidate",
                "recommendations": recommendations,
                "cached": True,
            },
            "Cached job recommendations retrieved",
        )
    except Exception:
        return success_response(
            {
                "source_id": candidate_id,
                "source_type": "candidate",
                "recommendations": [],
                "cached": False,
            },
            "No cached recommendations found",
        )


# ── Candidate recommendations (for jobs) ─────────────────────────────────

@router.post("/api/ai/recommendations/candidates")
async def recommend_candidates(
    req: RecommendCandidatesRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    """Compute Top-K candidate recommendations for a job offer."""
    pipeline = RecommendationPipeline(settings, provider)
    result = await pipeline.recommend_candidates_for_job(
        job_id=req.job_id,
        job_offer=req.job_offer,
        top_k=req.top_k,
        language=req.language,
        trigger="manual_refresh",
    )
    return success_response(
        result.model_dump(),
        "Candidate recommendations computed successfully",
    )


@router.post("/api/ai/recommendations/candidates/refresh")
async def refresh_candidate_recommendations(
    req: RecommendCandidatesRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    """Force-recompute candidate recommendations for a job offer."""
    pipeline = RecommendationPipeline(settings, provider)
    result = await pipeline.recommend_candidates_for_job(
        job_id=req.job_id,
        job_offer=req.job_offer,
        top_k=req.top_k,
        language=req.language,
        trigger="manual_refresh",
    )
    return success_response(
        result.model_dump(),
        "Candidate recommendations refreshed successfully",
    )


@router.get("/api/ai/recommendations/candidates/{job_id}")
async def get_cached_candidate_recommendations(
    job_id: str,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Retrieve cached candidate recommendations for a job offer."""
    try:
        recommendations = await _get_cached_recommendations(job_id, "job")
        return success_response(
            {
                "source_id": job_id,
                "source_type": "job",
                "recommendations": recommendations,
                "cached": True,
            },
            "Cached candidate recommendations retrieved",
        )
    except Exception:
        return success_response(
            {
                "source_id": job_id,
                "source_type": "job",
                "recommendations": [],
                "cached": False,
            },
            "No cached recommendations found",
        )


# ── Indexing endpoints (for batch / incremental updates) ──────────────────

@router.post("/api/ai/recommendations/index/candidates")
async def index_candidates(
    payload: dict,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Batch-index candidate profiles into the recommendation vector store."""
    pipeline = RecommendationPipeline(settings)
    candidates = payload.get("candidates", [])
    indexed = 0
    for item in candidates:
        cid = item.get("id") or item.get("userId")
        if not cid:
            continue
        try:
            pipeline.index_candidate(cid, item)
            indexed += 1
        except Exception:
            pass
    return success_response(
        {"indexed": indexed, "total": len(candidates)},
        f"Indexed {indexed} candidates",
    )


@router.post("/api/ai/recommendations/index/jobs")
async def index_jobs(
    payload: dict,
    settings: Settings = Depends(get_settings),
) -> dict:
    """Batch-index job offers into the recommendation vector store."""
    pipeline = RecommendationPipeline(settings)
    jobs = payload.get("jobs", [])
    indexed = 0
    for item in jobs:
        jid = item.get("id")
        if not jid:
            continue
        try:
            pipeline.index_job(jid, item)
            indexed += 1
        except Exception:
            pass
    return success_response(
        {"indexed": indexed, "total": len(jobs)},
        f"Indexed {indexed} jobs",
    )


# ── Helpers ───────────────────────────────────────────────────────────────

async def _get_cached_recommendations(source_id: str, source_type: str) -> list[dict]:
    """Retrieve active, non-expired recommendations from PostgreSQL."""
    from sqlalchemy import select

    async with AsyncSessionLocal() as db:
        stmt = (
            select(Recommendation)
            .where(
                Recommendation.source_id == uuid.UUID(source_id),
                Recommendation.source_type == source_type,
                Recommendation.is_active == True,
                Recommendation.expires_at > datetime.now(timezone.utc),
            )
            .order_by(Recommendation.rank)
        )
        result = await db.execute(stmt)
        rows = result.scalars().all()

        return [
            RecommendationItem(
                rank=row.rank,
                entity_id=str(row.target_id),
                entity_type=row.target_type,
                overall_score=row.overall_score,
                breakdown=RecommendationScoreBreakdown(**row.score_breakdown),
                explanation=row.explanation,
                metadata=row.metadata_payload or {},
            ).model_dump()
            for row in rows
        ]
