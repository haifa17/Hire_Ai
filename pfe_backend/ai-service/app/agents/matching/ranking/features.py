"""Assembles the raw (non pre-averaged) feature vector consumed by the
Phase-2 LightGBM ranker. Each of the 7 unified criteria is kept as an
individual feature (0.0 when unavailable) so the model can learn its own
weighting instead of relying on the fixed unified weighted-average.
"""
from __future__ import annotations

from app.agents.scoring.unified_engine import UnifiedScore

FEATURE_NAMES = [
    "skills",
    "experience",
    "semantic",
    "education",
    "projects",
    "languages",
    "certifications",
]


def assemble_feature_vector(unified: UnifiedScore) -> dict[str, float]:
    b = unified.breakdown
    return {
        "skills": b.skills if b.skills is not None else 0.0,
        "experience": b.experience if b.experience is not None else 0.0,
        "semantic": b.semantic if b.semantic is not None else 0.0,
        "education": b.education if b.education is not None else 0.0,
        "projects": b.projects if b.projects is not None else 0.0,
        "languages": b.languages if b.languages is not None else 0.0,
        "certifications": b.certifications if b.certifications is not None else 0.0,
    }
