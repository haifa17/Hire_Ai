from __future__ import annotations

import uuid
from datetime import datetime
from typing import Any

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

CASCADE_ALL_DELETE_ORPHAN = "all, delete-orphan"


class Base(DeclarativeBase):
    pass


class Document(Base):
    __tablename__ = "documents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    type: Mapped[str] = mapped_column(String(50), nullable=False)  # "resume" or "job_offer"
    source_file: Mapped[str | None] = mapped_column(String(255), nullable=True)
    extraction_status: Mapped[str] = mapped_column(String(50), default="PENDING")
    confidence_score: Mapped[float] = mapped_column(Float, default=0.0)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    # Relationships
    candidate: Mapped[Candidate | None] = relationship(
        "Candidate", back_populates="document", cascade=CASCADE_ALL_DELETE_ORPHAN
    )
    job_offer: Mapped[JobOffer | None] = relationship(
        "JobOffer", back_populates="document", cascade=CASCADE_ALL_DELETE_ORPHAN
    )


class Candidate(Base):
    __tablename__ = "candidates"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    identity: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    summary: Mapped[str] = mapped_column(Text, default="")
    total_experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    education: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    skills_raw: Mapped[list[str]] = mapped_column(JSONB, default=list)
    languages: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    certifications: Mapped[list[str]] = mapped_column(JSONB, default=list)
    location: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped[Document | None] = relationship("Document", back_populates="candidate")
    matching_results: Mapped[list[MatchingResult]] = relationship(
        "MatchingResult", back_populates="candidate", cascade=CASCADE_ALL_DELETE_ORPHAN
    )


class JobOffer(Base):
    __tablename__ = "ai_job_offers"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    document_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=True
    )
    title: Mapped[str] = mapped_column(String(255), default="")
    company: Mapped[str] = mapped_column(String(255), default="")
    missions: Mapped[list[str]] = mapped_column(JSONB, default=list)
    required_skills: Mapped[list[str]] = mapped_column(JSONB, default=list)
    nice_to_have_skills: Mapped[list[str]] = mapped_column(JSONB, default=list)
    required_experience_years: Mapped[float] = mapped_column(Float, default=0.0)
    contract_type: Mapped[str] = mapped_column(String(100), default="")
    location: Mapped[str] = mapped_column(String(255), default="")
    salary_range: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    education_level: Mapped[str] = mapped_column(String(100), default="")
    languages: Mapped[list[str]] = mapped_column(JSONB, default=list)
    raw_text: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    document: Mapped[Document | None] = relationship("Document", back_populates="job_offer")
    matching_results: Mapped[list[MatchingResult]] = relationship(
        "MatchingResult", back_populates="job_offer", cascade=CASCADE_ALL_DELETE_ORPHAN
    )


class SkillTaxonomy(Base):
    __tablename__ = "skills_taxonomy"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    canonical_name: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    aliases: Mapped[list[str]] = mapped_column(JSONB, default=list)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True)
    parent_skill_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("skills_taxonomy.id", ondelete="SET NULL"), nullable=True
    )
    # ESCO enrichment (nullable — populated by `python -m app.scripts.import_esco`,
    # rows without these stay valid entries from the legacy custom taxonomy)
    esco_uri: Mapped[str | None] = mapped_column(String(255), nullable=True)
    esco_type: Mapped[str | None] = mapped_column(String(50), nullable=True)
    preferred_label_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    preferred_label_fr: Mapped[str | None] = mapped_column(String(255), nullable=True)


class Embedding(Base):
    __tablename__ = "embeddings"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    entity_type: Mapped[str] = mapped_column(String(50), nullable=False)  # "candidate" or "job_offer"
    vector: Mapped[list[float]] = mapped_column(JSONB, nullable=False)
    model_version: Mapped[str] = mapped_column(String(100), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class MatchingResult(Base):
    __tablename__ = "matching_results"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    candidate_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False
    )
    job_offer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ai_job_offers.id", ondelete="CASCADE"), nullable=False
    )
    global_score: Mapped[int] = mapped_column(Integer, default=0)
    sub_scores: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    explanation: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    candidate: Mapped[Candidate] = relationship("Candidate", back_populates="matching_results")
    job_offer: Mapped[JobOffer] = relationship("JobOffer", back_populates="matching_results")
    audit_logs: Mapped[list[AuditLog]] = relationship(
        "AuditLog", back_populates="matching_result", cascade=CASCADE_ALL_DELETE_ORPHAN
    )


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    matching_result_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("matching_results.id", ondelete="CASCADE"), nullable=False
    )
    checks: Mapped[list[dict[str, Any]]] = mapped_column(JSONB, default=list)
    flagged: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    matching_result: Mapped[MatchingResult] = relationship("MatchingResult", back_populates="audit_logs")


class Recommendation(Base):
    """Stores individual recommendation results (job→candidate or candidate→job)."""

    __tablename__ = "recommendations"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "candidate" or "job"
    target_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    target_type: Mapped[str] = mapped_column(
        String(20), nullable=False
    )  # "job" or "candidate"
    rank: Mapped[int] = mapped_column(Integer, default=0)
    overall_score: Mapped[float] = mapped_column(Float, default=0.0)
    score_breakdown: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    explanation: Mapped[str] = mapped_column(Text, default="")
    metadata_payload: Mapped[dict[str, Any]] = mapped_column(JSONB, default=dict)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    expires_at: Mapped[datetime] = mapped_column(DateTime, nullable=True)

    __table_args__ = (
        # Fast lookup: "give me active recommendations for this source"
        # Index name kept short to avoid PostgreSQL identifier limits
        {"comment": "Recommendation results with TTL-based caching"},
    )


class RecommendationLog(Base):
    """Audit log for recommendation pipeline executions."""

    __tablename__ = "recommendation_logs"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    source_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), nullable=False)
    source_type: Mapped[str] = mapped_column(String(20), nullable=False)
    trigger: Mapped[str] = mapped_column(
        String(50), nullable=False
    )  # "auto_publish", "manual_refresh", "profile_update", "scheduled"
    items_searched: Mapped[int] = mapped_column(Integer, default=0)
    duration_ms: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(
        String(20), default="pending"
    )  # "completed", "failed", "partial"
    error_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
