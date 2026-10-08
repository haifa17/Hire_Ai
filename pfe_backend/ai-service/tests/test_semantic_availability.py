"""Tests for the semantic engine's `None` handling (plan §3/§4): an empty
section on both sides must become `None` (excluded from renormalization)
rather than the old neutral 0.5 filler, while a real encoding failure on
non-empty text must invalidate the whole semantic criterion."""
from __future__ import annotations

from app.agents.matching.semantic.engine import compute_semantic_score
from app.config.settings import get_settings
from app.schemas.matching import CandidateProfileSchema, IdentitySchema, JobOfferSchema


class _StubProvider:
    """Encodes any non-empty section text to a fixed vector; returns None for
    sections it's told to "fail" on (simulating a real encoding failure)."""

    def __init__(self, fail_sections: set[str] | None = None) -> None:
        self.available = True
        self.fail_sections = fail_sections or set()

    def encode_sections(self, sections: dict[str, str]) -> dict[str, list[float] | None]:
        result: dict[str, list[float] | None] = {}
        for name, text in sections.items():
            if name in self.fail_sections and text.strip():
                result[name] = None
            elif text.strip():
                result[name] = [1.0, 0.0, 0.0]
            else:
                result[name] = None
        return result


def test_semantic_score_both_sides_empty_section_is_none():
    settings = get_settings()
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))  # empty summary/skills/experience
    job_offer = JobOfferSchema(title="")  # empty summary text too (title/missions/skills all empty)
    result = compute_semantic_score(candidate, job_offer, _StubProvider(), None, settings)
    # Every section had nothing to embed on both sides -> None, no crash,
    # aggregate falls back to None (no criterion available at all).
    assert all(v is None for v in result.per_section.values())
    assert result.aggregate is None
    assert result.available is True  # no real encoding failure occurred


def test_semantic_score_encoding_failure_invalidates_whole_criterion():
    settings = get_settings()
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"), summary="Experienced backend engineer", skillsRaw=["python"]
    )
    job_offer = JobOfferSchema(title="Backend Engineer", requiredSkillsRaw=["python"])
    # "summary" section has real (non-empty) text on both sides but the
    # provider fails to encode it -> the whole semantic criterion is
    # invalidated, not just that section.
    result = compute_semantic_score(candidate, job_offer, _StubProvider(fail_sections={"summary"}), None, settings)
    assert result.available is False
    assert result.aggregate is None


def test_semantic_score_renormalizes_over_available_sections():
    settings = get_settings()
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), skillsRaw=["python"])
    job_offer = JobOfferSchema(title="Dev", requiredSkillsRaw=["python"])
    # summary/experience are empty on both sides (candidate has no summary or
    # experiences, job has no missions) -> only "skills" has real content.
    result = compute_semantic_score(candidate, job_offer, _StubProvider(), None, settings)
    assert result.per_section["summary"] is None
    assert result.per_section["skills"] is not None
    assert result.aggregate is not None
    assert result.available is True
