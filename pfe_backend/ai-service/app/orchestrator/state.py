from __future__ import annotations

from pydantic import BaseModel, Field

from app.schemas.matching import (
    CandidateProfileSchema,
    ExplanationFeatureSchema,
    JobOfferSchema,
    MatchingResultSchema,
    RuleBasedScoreSchema,
    SemanticScoreSchema,
)
from app.schemas.scoring import UnifiedBreakdownSchema


class GraphState(BaseModel):
    candidate: CandidateProfileSchema
    jobOffer: JobOfferSchema
    language: str = "en"
    trace: list[str] = Field(default_factory=list)
    extractedCandidateText: str = ""
    extractedJobText: str = ""
    normalizedCandidate: CandidateProfileSchema | None = None
    normalizedJobOffer: JobOfferSchema | None = None
    candidateVector: list[float] = Field(default_factory=list)
    jobVector: list[float] = Field(default_factory=list)
    breakdown: UnifiedBreakdownSchema | None = None
    unavailableCriteria: list[str] = Field(default_factory=list)
    matchedSkills: list[str] = Field(default_factory=list)
    missingSkills: list[str] = Field(default_factory=list)
    strengths: list[str] = Field(default_factory=list)
    gaps: list[str] = Field(default_factory=list)
    explanation: str = ""
    matchingResult: MatchingResultSchema | None = None
    # rule-based/semantic/LGBM engine outputs
    finalScore: int | None = None
    scoreAvailable: bool = False
    scoringMethod: str = "unified_weighted_average"
    ruleBasedScore: RuleBasedScoreSchema | None = None
    semanticScore: SemanticScoreSchema | None = None
    shapExplanation: list[ExplanationFeatureSchema] = Field(default_factory=list)
