from __future__ import annotations

import logging
import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.agents.job_offer_agent import JobOfferGenerationAgent
from app.api.schemas.job_offer import JobOfferGenerationRequest
from app.config.settings import Settings, get_settings
from app.core.responses import success_response
from app.providers.base import AIProvider
from app.providers.factory import get_provider

logger = logging.getLogger("smart-cv-ai-service")

router = APIRouter()


@router.post("/api/ai/generate-job-offer")
async def generate_job_offer(
    req: JobOfferGenerationRequest,
    settings: Annotated[Settings, Depends(get_settings)],
    provider: Annotated[AIProvider, Depends(get_provider)],
) -> dict:
    request_id = str(uuid.uuid4())
    agent = JobOfferGenerationAgent(provider)

    logger.info(
        "[%s] Generating job offer with provider=%s model=%s language=%s",
        request_id,
        settings.ai_provider,
        settings.active_model_name,
        req.language,
    )

    content = agent.run(req.prompt, req.language)

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "content": content,
        },
        "Job offer generated successfully",
    )