from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from app.config.settings import Settings, get_settings
from app.core.responses import success_response
from app.orchestrator.graph import MatchingGraph
from app.providers.base import AIProvider
from app.providers.factory import get_provider
from app.schemas.matching import MatchingRunRequest, MatchingSearchRequest

router = APIRouter()


@router.post("/api/ai/matching/run")
async def run_matching(
    req: MatchingRunRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())
    graph = MatchingGraph(settings, provider)
    matching_result = await graph.run_matching_pipeline(req)

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "matchingResult": matching_result.model_dump(),
            "content": matching_result.model_dump(),
        },
        "Matching score computed successfully",
    )


@router.post("/api/ai/matching/search")
async def search_matching(
    req: MatchingSearchRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())
    graph = MatchingGraph(settings, provider)
    if not req.candidates:
        return success_response(
            {
                "requestId": request_id,
                "provider": settings.ai_provider,
                "model": settings.active_model_name,
                "jobOffer": req.jobOffer.model_dump(),
                "topCandidates": [],
                "content": [],
            },
            "Matching ranking computed successfully",
        )

    top_candidates = await graph.rank_candidates(
        req.jobOffer,
        req.candidates,
        req.language,
        req.topK,
    )

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "jobOffer": req.jobOffer.model_dump(),
            "topCandidates": [item.model_dump() for item in top_candidates],
            "content": [item.model_dump() for item in top_candidates],
        },
        "Matching ranking computed successfully",
    )


@router.post("/api/ai/matching/run-async")
def run_matching_async(
    req: MatchingRunRequest,
    settings: Settings = Depends(get_settings),
) -> dict:
    from app.tasks import run_matching_pipeline_task
    task = run_matching_pipeline_task.delay(
        req.candidate.model_dump(),
        req.jobOffer.model_dump(),
        req.language,
    )
    return success_response(
        {
            "taskId": task.id,
            "status": task.status,
        },
        "Asynchronous matching pipeline job queued successfully",
    )
