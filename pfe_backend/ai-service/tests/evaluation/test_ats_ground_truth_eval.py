"""Evaluates ATSScoringAgent's `overall` score against anchored ground-truth
cases — resume/job pairs designed so that any reasonable human recruiter
would agree on which broad band the score belongs in.

This is NOT a substitute for a real human-labeled dataset (which this repo
doesn't have yet — see tests/evaluation/README.md if one is added later).
Real human scoring has fine-grained disagreement in the middle of the scale
(is this 62 or 71?) that no small synthetic set can capture. What a
synthetic anchored set CAN check, uncontroversially, is that the agent
doesn't grossly misjudge the obvious extremes and preserves their relative
order — e.g. an unrelated-domain resume must never outscore a same-domain
resume, whatever the exact numbers are. That's the bar this test enforces.

Metrics:
  - Band correctness: each case's `overall` score must land within a wide,
    uncontroversial band for its designed match quality (perfect / partial /
    zero), not an exact target — exact-number ground truth would make this
    test a coin flip on judge-model variance rather than a real regression
    guard.
  - Monotonic ordering: perfect_match > partial_match > zero_match, which
    must hold regardless of where exactly each one lands within its band.
"""

from __future__ import annotations

import pytest

from app.agents.ats_agent import ATSScoringAgent

PERFECT_MATCH_RESUME = """
Sarah Chen - Senior Backend Engineer
8 years of experience building REST and GraphQL APIs in Python using FastAPI, Django, and PostgreSQL.
Led migration of a monolith to microservices deployed on Kubernetes with Docker and CI/CD via GitHub Actions.
Skills: Python, FastAPI, Django, PostgreSQL, Docker, Kubernetes, GitHub Actions, Redis.
Education: BSc Computer Science.
""".strip()

PARTIAL_MATCH_RESUME = """
Marc Dubois - Backend Developer
3 years of experience building REST APIs in Python using Flask and MySQL.
Skills: Python, Flask, MySQL, Git.
Education: BSc Computer Science.
""".strip()

ZERO_MATCH_RESUME = """
Julie Laurent - Registered Nurse
5 years of experience in patient care, clinical documentation, and phlebotomy at a regional hospital.
Skills: Patient care, clinical documentation, phlebotomy, EMR systems.
Education: BSc Nursing.
""".strip()

JOB_DESCRIPTION = (
    "Senior Backend Engineer needed. Required: Python, FastAPI, PostgreSQL, Docker, Kubernetes, "
    "CI/CD experience. 5+ years of backend development experience."
)

# Wide, uncontroversial bands — not exact targets. See module docstring.
PERFECT_MATCH_MIN = 75
ZERO_MATCH_MAX = 35
PARTIAL_MATCH_RANGE = (30, 85)


@pytest.fixture(scope="module")
def score_perfect(ai_provider):
    return ATSScoringAgent(ai_provider).run(PERFECT_MATCH_RESUME, JOB_DESCRIPTION)


@pytest.fixture(scope="module")
def score_partial(ai_provider):
    return ATSScoringAgent(ai_provider).run(PARTIAL_MATCH_RESUME, JOB_DESCRIPTION)


@pytest.fixture(scope="module")
def score_zero(ai_provider):
    return ATSScoringAgent(ai_provider).run(ZERO_MATCH_RESUME, JOB_DESCRIPTION)


def test_near_perfect_match_scores_high(score_perfect):
    assert score_perfect.overall >= PERFECT_MATCH_MIN, (
        f"A resume matching every required skill (Python, FastAPI, PostgreSQL, Docker, "
        f"Kubernetes, CI/CD) and exceeding the experience requirement scored only "
        f"{score_perfect.overall}, below the {PERFECT_MATCH_MIN} floor any reasonable "
        f"recruiter would expect for this case."
    )


def test_wrong_domain_resume_scores_low(score_zero):
    assert score_zero.overall <= ZERO_MATCH_MAX, (
        f"A nursing resume with zero overlapping skills against a Backend Engineer "
        f"job scored {score_zero.overall}, above the {ZERO_MATCH_MAX} ceiling any "
        f"reasonable recruiter would expect for a completely unrelated domain."
    )


def test_partial_match_scores_in_a_middle_band(score_partial):
    low, high = PARTIAL_MATCH_RANGE
    assert low <= score_partial.overall <= high, (
        f"A resume sharing the language (Python) and general role (backend developer) "
        f"but missing FastAPI/PostgreSQL/Docker/Kubernetes and half the required "
        f"experience scored {score_partial.overall}, outside the expected "
        f"[{low}, {high}] middle band."
    )


def test_scores_preserve_relative_order(score_perfect, score_partial, score_zero):
    assert score_perfect.overall > score_partial.overall > score_zero.overall, (
        f"Expected perfect > partial > zero, got "
        f"perfect={score_perfect.overall}, partial={score_partial.overall}, "
        f"zero={score_zero.overall}. Whatever the exact numbers, a same-domain "
        f"partial match must never be out-scored by a fully unrelated resume, and "
        f"a full match must never be out-scored by a partial one."
    )
