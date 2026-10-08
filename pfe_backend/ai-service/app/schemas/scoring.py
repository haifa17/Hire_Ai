"""Unified scoring breakdown schema, shared by the matching pipeline and the
recommendation pipeline (see `app/agents/scoring/unified_engine.py`).

Each field is `float | None`: `None` means the criterion could not be
evaluated (missing requirement or missing candidate data), NOT a zero score.
Callers must not coerce `None` to 0 — that would double-punish incomplete
profiles/offers on top of the weight-renormalization already performed by
`compute_weighted_score`.
"""
from __future__ import annotations

from pydantic import BaseModel


class UnifiedBreakdownSchema(BaseModel):
    skills: float | None = None
    experience: float | None = None
    semantic: float | None = None
    education: float | None = None
    projects: float | None = None
    languages: float | None = None
    certifications: float | None = None
