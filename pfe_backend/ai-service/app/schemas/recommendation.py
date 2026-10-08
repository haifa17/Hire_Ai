"""Pydantic schemas for the recommendation module."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from app.schemas.scoring import UnifiedBreakdownSchema


# ── Feature Extraction Schemas ────────────────────────────────────────────────

class CandidateFeatures(BaseModel):
    """Extracted and normalised candidate features for recommendation."""

    candidate_id: str
    name: str = ""
    skills: list[str] = Field(default_factory=list)
    experience_years: float = 0.0
    education_level: str = ""
    education_rank: int = 0
    location: str = ""
    desired_salary: float | None = None
    languages: list[str] = Field(default_factory=list)
    certifications: list[str] = Field(default_factory=list)
    desired_position: str = ""
    open_to_work: bool = False
    employment_preferences: list[str] = Field(default_factory=list)
    summary_text: str = ""  # rich text for embedding generation

    # ── Structured snapshot (plan §6/§8) ──────────────────────────────────
    # Stored in the Qdrant payload at indexing time so the unified scoring
    # engine's rich schemas (`CandidateProfileSchema`) can be reconstructed
    # at fine-scoring time without re-fetching from Postgres/NestJS. Each
    # entry mirrors `ExperienceSchema`/`EducationSchema` field names so
    # `recommendation_adapter.py` can round-trip them directly.
    experiences_snapshot: list[dict[str, Any]] = Field(default_factory=list)
    education_snapshot: list[dict[str, Any]] = Field(default_factory=list)


class JobFeatures(BaseModel):
    """Extracted and normalised job offer features for recommendation."""

    job_id: str
    title: str = ""
    company: str = ""
    industry: str = ""
    required_skills: list[str] = Field(default_factory=list)
    preferred_skills: list[str] = Field(default_factory=list)
    experience_years: float = 0.0
    education_level: str = ""
    education_rank: int = 0
    location: str = ""
    country: str = ""
    city: str = ""
    salary_min: float | None = None
    salary_max: float | None = None
    currency: str = "USD"
    employment_type: str = ""
    workplace_type: str = ""
    languages: list[str] = Field(default_factory=list)
    responsibilities: list[str] = Field(default_factory=list)
    requirements: list[str] = Field(default_factory=list)
    summary_text: str = ""  # rich text for embedding generation

    # ── Structured snapshot (plan §6/§8) ──────────────────────────────────
    required_certifications: list[str] = Field(default_factory=list)
    nice_to_have_skills: list[str] = Field(default_factory=list)  # alias-mirror of preferred_skills


# ── Scoring Schemas ───────────────────────────────────────────────────────────
#
# The recommendation pipeline now shares the same 7-criterion breakdown and
# `unified_engine.compute_unified_score` as the matching pipeline (plan §1) —
# `RecommendationScoreBreakdown` is kept as an alias only so existing imports
# of the old name keep working.
RecommendationScoreBreakdown = UnifiedBreakdownSchema


class RecommendationItem(BaseModel):
    """A single recommendation result with rank, score, explanation, and entity metadata."""

    rank: int = 0
    entity_id: str
    entity_type: str  # "job" or "candidate"
    overall_score: float | None = Field(default=None, ge=0.0, le=100.0)
    breakdown: UnifiedBreakdownSchema = Field(default_factory=UnifiedBreakdownSchema)
    unavailable_criteria: list[str] = Field(default_factory=list)
    explanation: str = ""
    metadata: dict[str, Any] = Field(default_factory=dict)


# ── API Request / Response Schemas ────────────────────────────────────────────

class RecommendJobsRequest(BaseModel):
    """Request body for computing job recommendations for a candidate."""

    candidate_id: str
    candidate_profile: dict[str, Any]  # full profile payload from NestJS
    # Accept whatever the caller (Nest, still defaulting to 10 in places)
    # sends; recommend_jobs_for_candidate hard-caps the actual result to 5.
    top_k: int = Field(default=5, ge=1, le=50)
    language: str = "en"


class RecommendCandidatesRequest(BaseModel):
    """Request body for computing candidate recommendations for a job offer."""

    job_id: str
    job_offer: dict[str, Any]  # full job offer payload from NestJS
    top_k: int = Field(default=10, ge=1, le=50)
    language: str = "en"


class RecommendationResponse(BaseModel):
    """Response body for recommendation endpoints."""

    request_id: str
    source_id: str
    source_type: str  # "candidate" or "job"
    recommendations: list[RecommendationItem] = Field(default_factory=list)
    computed_at: str = ""
    cached: bool = False


# ── Internal Pipeline Schemas ─────────────────────────────────────────────────

class RetrievedCandidate(BaseModel):
    """Intermediate result from Qdrant retrieval for a candidate."""

    candidate_id: str
    vector_score: float = 0.0
    payload: dict[str, Any] = Field(default_factory=dict)


class RetrievedJob(BaseModel):
    """Intermediate result from Qdrant retrieval for a job offer."""

    job_id: str
    vector_score: float = 0.0
    payload: dict[str, Any] = Field(default_factory=dict)


class RerankResult(BaseModel):
    """Result from cross-encoder re-ranking."""

    entity_id: str
    cross_encoder_score: float = 0.0
    original_rank: int = 0
