from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class JobOfferGenerationRequest(BaseModel):
    prompt: str = Field(min_length=8, max_length=400)
    language: Literal["EN", "FR", "en", "fr"] = Field(default="EN")


class JobOfferGenerationContent(BaseModel):
    title: str = "Generated Job Offer"
    summary: str = ""
    department: str = ""
    employmentType: Literal[
        "FULL_TIME",
        "PART_TIME",
        "CONTRACT",
        "CDD",
        "CDI",
        "TEMPORARY",
        "INTERNSHIP",
        "FREELANCE",
    ] = "FULL_TIME"
    workplaceType: Literal["ONSITE", "HYBRID", "REMOTE"] = "REMOTE"
    location: str = ""
    country: str = ""
    city: str = ""
    experienceLevel: Literal[
        "ENTRY",
        "JUNIOR",
        "MID",
        "SENIOR",
        "LEAD",
        "EXECUTIVE",
    ] = "MID"
    educationLevel: Literal[
        "HIGH_SCHOOL",
        "ASSOCIATE",
        "BACHELOR",
        "MASTER",
        "PHD",
        "OTHER",
    ] | None = None
    currency: str = "USD"
    salaryMin: float | None = None
    salaryMax: float | None = None
    openings: int = 1
    responsibilities: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    requiredSkills: list[str] = Field(default_factory=list)
    preferredSkills: list[str] = Field(default_factory=list)
    benefits: list[str] = Field(default_factory=list)
    languages: list[str] = Field(default_factory=list)
    keywords: list[str] = Field(default_factory=list)
    featured: bool = False
    urgent: bool = False


class JobOfferGenerationData(BaseModel):
    requestId: str
    provider: str
    model: str
    content: JobOfferGenerationContent


class JobOfferGenerationResponse(BaseModel):
    success: bool = True
    message: str = "Job offer generated successfully"
    data: JobOfferGenerationData