from __future__ import annotations

import uuid

from fastapi import APIRouter, Depends

from app.agents.ats_agent import ATSScoringAgent
from app.agents.resume_optimizer_agent import ResumeOptimizerAgent
from app.api.schemas.ats import ATSScoringRequest, OptimizeResumeRequest
from app.config.settings import Settings, get_settings
from app.core.responses import success_response
from app.providers.base import AIProvider
from app.providers.factory import get_provider

router = APIRouter()


@router.post("/api/ai/score-resume")
async def score_resume(
    req: ATSScoringRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())
    agent = ATSScoringAgent(provider)
    ats_score = agent.run(req.resumeContent, req.jobDescription)

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "atsScore": ats_score.model_dump(),
        },
        "ATS score computed successfully",
    )


@router.post("/api/ai/optimize-resume")
async def optimize_resume(
    req: OptimizeResumeRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())
    agent = ResumeOptimizerAgent(provider)
    result = agent.run(
        resume_content=req.resumeContent,
        missing_keywords=req.missingKeywords,
        suggestions=req.suggestions,
        job_description=req.jobDescription,
        language=req.language,
    )

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "optimizedContent": result.optimizedContent,
            "addedKeywords": result.addedKeywords,
            "modifiedSections": result.modifiedSections,
            "summaryOfChanges": result.summaryOfChanges,
        },
        "Resume optimized successfully",
    )

