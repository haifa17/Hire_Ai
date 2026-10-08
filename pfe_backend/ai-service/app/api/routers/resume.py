from __future__ import annotations

import logging
import uuid
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile

from app.agents.resume_agent import ResumeGenerationAgent
from app.agents.resume_enhancer_agent import ResumeEnhancerAgent
from app.api.schemas.resume import ResumeGenerationRequest
from app.config.settings import Settings, get_settings
from app.core.exceptions import AppException
from app.core.responses import success_response
from app.providers.base import AIProvider
from app.providers.factory import get_provider
from app.utils.document_parser import parse_document

logger = logging.getLogger("smart-cv-ai-service")

router = APIRouter()


@router.post("/api/ai/generate-resume")
async def generate_resume(
    req: ResumeGenerationRequest,
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())
    agent = ResumeGenerationAgent(provider)

    logger.info(
        "[%s] Generating resume with provider=%s model=%s language=%s",
        request_id,
        settings.ai_provider,
        settings.active_model_name,
        req.language,
    )

    content = agent.run(req.profile, req.jobDescription, req.language)

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "content": content,
        },
        "Resume generated successfully",
    )


@router.post("/api/ai/enhance-resume")
async def enhance_resume(
    file: UploadFile = File(...),
    job_description: str = Form(..., alias="jobDescription"),
    language: str = Form("EN"),
    resume_text_override: Optional[str] = Form(None, alias="resumeTextOverride"),
    settings: Settings = Depends(get_settings),
    provider: AIProvider = Depends(get_provider),
) -> dict:
    request_id = str(uuid.uuid4())

    if resume_text_override and resume_text_override.strip():
        extracted_text = resume_text_override.strip()
    else:
        file_bytes = await file.read()
        extracted_text = parse_document(
            file_bytes=file_bytes,
            filename=file.filename or "",
            content_type=file.content_type or "",
        )

    if not extracted_text:
        raise AppException(
            code="UNREADABLE_FILE",
            message="Could not extract readable text from the uploaded file. Please make sure the file format is supported (JPEG, PNG, PDF, DOC, DOCX) and not empty.",
            status_code=400,
        )

    # language is user-controlled input; log its repr() rather than the raw
    # value so embedded newlines/control characters can't forge extra log
    # lines (log injection).
    logger.info(
        "[%s] Enhancing resume (extracted %d chars) with provider=%s model=%s language=%r",
        request_id,
        len(extracted_text),
        settings.ai_provider,
        settings.active_model_name,
        language,
    )

    agent = ResumeEnhancerAgent(provider)
    content = agent.run(
        resume_text=extracted_text,
        job_description=job_description,
        language=language,
    )

    return success_response(
        {
            "requestId": request_id,
            "provider": settings.ai_provider,
            "model": settings.active_model_name,
            "content": content,
            "extractedLength": len(extracted_text),
        },
        "Resume enhanced successfully",
    )

