from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class ATSScoringRequest(BaseModel):
    resumeContent: Any
    jobDescription: str


class ATSScoreBreakdownSchema(BaseModel):
    keywordMatch: int = Field(ge=0, le=100)
    skillsMatch: int = Field(ge=0, le=100)
    experienceRelevance: int = Field(ge=0, le=100)
    formattingQuality: int = Field(ge=0, le=100)
    educationMatch: int = Field(ge=0, le=100)


class ATSScoreSchema(BaseModel):
    overall: int = Field(ge=0, le=100)
    breakdown: ATSScoreBreakdownSchema
    matchedKeywords: list[str]
    missingKeywords: list[str]
    suggestions: list[str]


class ATSScoringData(BaseModel):
    requestId: str
    provider: str
    model: str
    atsScore: ATSScoreSchema


class ATSScoringResponse(BaseModel):
    success: bool = True
    message: str = "ATS score computed successfully"
    data: ATSScoringData


class OptimizeResumeRequest(BaseModel):
    resumeContent: Any
    missingKeywords: list[str] = Field(default_factory=list)
    suggestions: list[str] = Field(default_factory=list)
    jobDescription: str = ""
    language: str = "en"


class OptimizeResumeData(BaseModel):
    requestId: str
    provider: str
    model: str
    optimizedContent: Any
    addedKeywords: list[str]
    modifiedSections: list[str]
    summaryOfChanges: str


class OptimizeResumeResponse(BaseModel):
    success: bool = True
    message: str = "Resume optimized successfully"
    data: OptimizeResumeData

