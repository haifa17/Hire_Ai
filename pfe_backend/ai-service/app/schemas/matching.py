from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

from app.schemas.scoring import UnifiedBreakdownSchema


class DocumentSource(BaseModel):
    id: str | None = None
    type: Literal[
        "resume",
        "job_offer",
        "application",
        "candidate_profile",
        "job_offer_profile",
        "document",
    ] = "document"
    sourceFile: str | None = None
    mimeType: str | None = None
    text: str | None = None
    content: Any | None = None
    sections: list[str] = Field(default_factory=list)


class IdentitySchema(BaseModel):
    name: str = ""
    location: str = ""
    email: str = ""
    phone: str = ""


class ExperienceSchema(BaseModel):
    title: str = ""
    company: str = ""
    startDate: str = ""
    endDate: str = ""
    description: str = ""
    skillsUsed: list[str] = Field(default_factory=list)


class EducationSchema(BaseModel):
    degree: str = ""
    institution: str = ""
    year: str = ""


class LanguageSchema(BaseModel):
    language: str = ""
    level: str = ""


class CandidateProfileSchema(BaseModel):
    id: str | None = None
    documentId: str | None = None
    sourceFile: str | None = None
    cvUrl: str | None = None
    mimeType: str | None = None
    identity: IdentitySchema = Field(default_factory=IdentitySchema)
    summary: str = ""
    experiences: list[ExperienceSchema] = Field(default_factory=list)
    education: list[EducationSchema] = Field(default_factory=list)
    skillsRaw: list[str] = Field(default_factory=list)
    languages: list[LanguageSchema] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    totalExperienceYears: float = 0.0
    location: str = ""
    rawText: str = ""


class JobOfferSchema(BaseModel):
    id: str | None = None
    documentId: str | None = None
    title: str = ""
    company: str = ""
    missions: list[str] = Field(default_factory=list)
    requiredSkillsRaw: list[str] = Field(default_factory=list)
    niceToHaveSkillsRaw: list[str] = Field(default_factory=list)
    requiredCertifications: list[str] = Field(default_factory=list)
    requiredExperienceYears: float = 0.0
    contractType: str = ""
    location: str = ""
    salaryRange: dict[str, Any] = Field(default_factory=dict)
    educationLevel: str = ""
    languages: list[str] = Field(default_factory=list)
    rawText: str = ""


class MatchingRunRequest(BaseModel):
    candidate: CandidateProfileSchema
    jobOffer: JobOfferSchema
    language: str = "en"
    # When true, bypasses the Redis matching-result cache and always recomputes
    # (used by the "rematch" / force-recompute flow — without this, a forced
    # rematch would silently return the same cached score).
    forceRecompute: bool = False


class MatchingSearchRequest(BaseModel):
    jobOffer: JobOfferSchema
    candidates: list[CandidateProfileSchema]
    topK: int = Field(default=10, ge=1, le=100)
    language: str = "en"


class CriterionScoreSchema(BaseModel):
    score: float | None = Field(default=None, ge=0, le=1)
    matched: list[str] = Field(default_factory=list)
    missing: list[str] = Field(default_factory=list)
    details: dict[str, Any] = Field(default_factory=dict)


class RuleBasedScoreSchema(BaseModel):
    total: float | None = Field(default=None, ge=0, le=1)
    skills: CriterionScoreSchema
    experience: CriterionScoreSchema
    projects: CriterionScoreSchema
    education: CriterionScoreSchema
    languages: CriterionScoreSchema
    certifications: CriterionScoreSchema


class SemanticScoreSchema(BaseModel):
    aggregate: float | None = Field(default=None, ge=0, le=1)
    summary: float | None = Field(default=None, ge=0, le=1)
    skills: float | None = Field(default=None, ge=0, le=1)
    experience: float | None = Field(default=None, ge=0, le=1)
    # False when the embedding model wasn't loaded, or a real encoding
    # failure occurred — `aggregate`/per-section values must then be excluded
    # from the final score; surfaced so the UI can flag this too.
    available: bool = True


class ExplanationFeatureSchema(BaseModel):
    feature: str
    value: float
    contribution: float


class MatchingResultSchema(BaseModel):
    candidateId: str | None = None
    jobOfferId: str | None = None
    globalScore: int | None = Field(default=None, ge=0, le=100)
    matchScore: int | None = Field(default=None, ge=0, le=100)
    score: int | None = Field(default=None, ge=0, le=100)
    atsScore: int | None = Field(default=None, ge=0, le=100)
    breakdown: UnifiedBreakdownSchema
    unavailableCriteria: list[str] = Field(default_factory=list)
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    explanation: str = ""
    candidateSummary: str = ""
    jobSummary: str = ""
    trace: list[str] = Field(default_factory=list)
    # Additive fields for the rule-based+semantic+SHAP engine — kept optional
    # so older callers that only read globalScore/breakdown are unaffected.
    ruleBasedScore: RuleBasedScoreSchema | None = None
    semanticScore: SemanticScoreSchema | None = None
    scoringMethod: str = "unified_weighted_average"
    shapExplanation: list[ExplanationFeatureSchema] = Field(default_factory=list)


class MatchingRunData(BaseModel):
    requestId: str
    provider: str
    model: str
    matchingResult: MatchingResultSchema
    content: MatchingResultSchema


class MatchingSearchItem(BaseModel):
    rank: int
    candidate: CandidateProfileSchema
    matchingResult: MatchingResultSchema


class MatchingSearchData(BaseModel):
    requestId: str
    provider: str
    model: str
    jobOffer: JobOfferSchema
    topCandidates: list[MatchingSearchItem]
    content: list[MatchingSearchItem]
