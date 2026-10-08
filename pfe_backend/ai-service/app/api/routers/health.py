from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends

from app.config.settings import Settings, get_settings
from app.core.responses import success_response

router = APIRouter()


@router.get("/health")
async def health_check(
    settings: Annotated[Settings, Depends(get_settings)],
) -> dict:
    return success_response(
        {
            "status": "ok",
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "groqConfigured": bool(settings.groq_api_key),
            "ollamaUrl": settings.ollama_url,
        },
        "AI service is healthy",
    )
