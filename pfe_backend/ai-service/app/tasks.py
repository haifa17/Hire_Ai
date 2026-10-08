from __future__ import annotations

import asyncio
import logging
from typing import Any, Dict

from celery import Celery

from app.config.settings import get_settings
from app.orchestrator.graph import MatchingGraph
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema, MatchingRunRequest

logger = logging.getLogger("smart-cv-ai-service")
settings = get_settings()

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


@celery_app.task(name="app.tasks.run_matching_pipeline_task")
def run_matching_pipeline_task(candidate_data: Dict[str, Any], job_offer_data: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
    """
    Celery task to run the multi-agent CV & Job matching pipeline asynchronously.
    """
    logger.info("Celery task received matching pipeline execution request.")
    
    # Run the async matching graph synchronously inside Celery worker's context
    async def _run():
        candidate = CandidateProfileSchema.model_validate(candidate_data)
        job_offer = JobOfferSchema.model_validate(job_offer_data)
        req = MatchingRunRequest(candidate=candidate, jobOffer=job_offer, language=language)
        
        # Instantiate graph and run pipeline
        graph = MatchingGraph(settings)
        result = await graph.run_matching_pipeline(req)
        return result.model_dump()
        
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
    result_data = loop.run_until_complete(_run())
    logger.info("Celery task completed matching pipeline execution.")
    return result_data
