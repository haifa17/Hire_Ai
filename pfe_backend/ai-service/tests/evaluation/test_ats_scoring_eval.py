"""Evaluates ATSScoringAgent (used by the ATS scoring endpoint).

Detects: incorrect extraction (a "matched keyword" that never actually
appears in the resume — a hallucinated match — or a keyword marked "missing"
that's actually present), and irrelevant/incoherent improvement suggestions.

Metrics:
  - Deterministic checks that matchedKeywords/missingKeywords are consistent
    with the actual resume text — this is a factual, checkable claim, not a
    matter of LLM judgment, so it's asserted directly rather than through a
    metric (a judge model is unnecessary and slower/costlier for something
    this literal to verify).
  - GEval "SuggestionRelevance": the free-text improvement suggestions must
    be actionable and grounded in the actual gap between resume and job
    description, not generic advice.
"""

from __future__ import annotations

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from app.agents.ats_agent import ATSScoringAgent
from tests.evaluation.thresholds import GEVAL_THRESHOLD

RESUME_TEXT = """
Alex Martin - Backend Developer
Experience: Built REST APIs in Python using FastAPI and PostgreSQL for 3 years at Acme Corp.
Skills: Python, FastAPI, PostgreSQL, Git.
""".strip()

JOB_DESCRIPTION = (
    "Looking for a Backend Developer with Python, FastAPI, PostgreSQL and Kubernetes experience."
)


@pytest.fixture(scope="module")
def ats_score(ai_provider):
    agent = ATSScoringAgent(ai_provider)
    return agent.run(RESUME_TEXT, JOB_DESCRIPTION)


def test_matched_keywords_actually_appear_in_resume(ats_score):
    resume_lower = RESUME_TEXT.lower()
    hallucinated = [kw for kw in ats_score.matchedKeywords if kw.lower() not in resume_lower]
    assert not hallucinated, (
        f"ATS agent reported keyword(s) as 'matched' that never appear in the resume text: {hallucinated}."
    )


def test_missing_keywords_are_not_actually_present(ats_score):
    resume_lower = RESUME_TEXT.lower()
    wrongly_missing = [kw for kw in ats_score.missingKeywords if kw.lower() in resume_lower]
    assert not wrongly_missing, (
        f"ATS agent listed keyword(s) as 'missing' that are actually present in the resume: {wrongly_missing}."
    )


def test_kubernetes_correctly_flagged_as_missing(ats_score):
    """The job asks for Kubernetes; the resume never mentions it — the ATS
    agent must flag it as missing, not silently drop it or claim a match."""
    missing_lower = [kw.lower() for kw in ats_score.missingKeywords]
    assert "kubernetes" in missing_lower, (
        f"ATS agent failed to flag 'Kubernetes' as a missing keyword despite the job requiring it "
        f"and the resume never mentioning it. missingKeywords: {ats_score.missingKeywords}"
    )


@pytest.mark.evaluation
def test_suggestions_are_relevant_to_the_actual_gap(ats_score, judge_model):
    relevance_metric = GEval(
        name="SuggestionRelevance",
        model=judge_model,
        threshold=GEVAL_THRESHOLD,
        evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "The 'input' describes a resume and a job description, with a known missing skill: Kubernetes.",
            "Check that at least one suggestion in 'actual_output' explicitly addresses the Kubernetes gap "
            "(e.g. adding Kubernetes experience or projects).",
            "Other suggestions may legitimately cover different ATS dimensions (formatting, education, "
            "keyword coverage) — do not penalize a suggestion just for being about a different dimension "
            "than the missing skill.",
            "Only penalize a suggestion if it is so vague it gives no actionable next step at all "
            "(e.g. 'improve your resume' with no specifics on what to change).",
        ],
    )
    test_case = LLMTestCase(
        input=f"Resume: {RESUME_TEXT}\nJob description: {JOB_DESCRIPTION}",
        actual_output="; ".join(ats_score.suggestions) or "(no suggestions given)",
    )
    assert_test(test_case, [relevance_metric])
