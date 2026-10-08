"""Celery tasks for asynchronous recommendation computation."""
from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from celery import Celery

from app.config.settings import get_settings

logger = logging.getLogger("smart-cv-ai-service")
settings = get_settings()

# Reuse the same Celery app from tasks.py
celery_app = Celery(
    "smart-cv-tasks",
    broker=settings.redis_url,
    backend=settings.redis_url,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(name="app.recommendation_tasks.compute_job_recommendations_task")
def compute_job_recommendations_task(
    candidate_id: str,
    candidate_profile: Dict[str, Any],
    top_k: int = 10,
    language: str = "en",
    trigger: str = "auto",
) -> Dict[str, Any]:
    """Celery task: compute job recommendations for a candidate asynchronously."""
    logger.info(f"[CeleryRec] Computing job recommendations for candidate {candidate_id}")

    async def _run() -> Dict[str, Any]:
        from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline

        pipeline = RecommendationPipeline(settings)
        result = await pipeline.recommend_jobs_for_candidate(
            candidate_id=candidate_id,
            candidate_profile=candidate_profile,
            top_k=top_k,
            language=language,
            trigger=trigger,
        )
        return result.model_dump()

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    result = loop.run_until_complete(_run())
    logger.info(f"[CeleryRec] Job recommendations completed for candidate {candidate_id}")
    return result


@celery_app.task(name="app.recommendation_tasks.compute_candidate_recommendations_task")
def compute_candidate_recommendations_task(
    job_id: str,
    job_offer: Dict[str, Any],
    top_k: int = 10,
    language: str = "en",
    trigger: str = "auto_publish",
) -> Dict[str, Any]:
    """Celery task: compute candidate recommendations for a job offer asynchronously."""
    logger.info(f"[CeleryRec] Computing candidate recommendations for job {job_id}")

    async def _run() -> Dict[str, Any]:
        from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline

        pipeline = RecommendationPipeline(settings)
        result = await pipeline.recommend_candidates_for_job(
            job_id=job_id,
            job_offer=job_offer,
            top_k=top_k,
            language=language,
            trigger=trigger,
        )
        return result.model_dump()

    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    result = loop.run_until_complete(_run())
    logger.info(f"[CeleryRec] Candidate recommendations completed for job {job_id}")
    return result


@celery_app.task(name="app.recommendation_tasks.index_candidate_task")
def index_candidate_task(candidate_id: str, profile: Dict[str, Any]) -> Dict[str, Any]:
    """Celery task: index a single candidate in the recommendation vector store."""
    from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline

    pipeline = RecommendationPipeline(settings)
    pipeline.index_candidate(candidate_id, profile)
    return {"status": "indexed", "candidate_id": candidate_id}


@celery_app.task(name="app.recommendation_tasks.index_job_task")
def index_job_task(job_id: str, job_offer: Dict[str, Any]) -> Dict[str, Any]:
    """Celery task: index a single job in the recommendation vector store."""
    from app.agents.recommendation.recommendation_pipeline import RecommendationPipeline

    pipeline = RecommendationPipeline(settings)
    pipeline.index_job(job_id, job_offer)
    return {"status": "indexed", "job_id": job_id}
