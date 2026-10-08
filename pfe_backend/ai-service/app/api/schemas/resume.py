from __future__ import annotations

from typing import Any, Dict, Literal

from pydantic import BaseModel, Field


class ResumeGenerationRequest(BaseModel):
    profile: Dict[str, Any]
    jobDescription: str
    language: Literal["EN", "FR", "en", "fr"] = Field(...)


class ResumeGenerationData(BaseModel):
    requestId: str
    provider: str
    model: str
    content: Dict[str, Any]


class ResumeGenerationResponse(BaseModel):
    success: bool = True
    message: str = "Resume generated successfully"
    data: ResumeGenerationData
