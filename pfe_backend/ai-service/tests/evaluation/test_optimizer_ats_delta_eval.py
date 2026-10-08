"""Evaluates ResumeOptimizerAgent by measuring its actual effect: does
optimizing a resume against a known ATS gap improve the ATS score?

Unlike test_ats_scoring_eval.py (which checks the ATS agent's own outputs
for internal consistency), this test treats ATSScoringAgent as the
measuring instrument and ResumeOptimizerAgent as the thing being measured:
score the resume, optimize it, score the result again, and assert the
optimizer actually moved the needle rather than just rewriting text.

Metrics:
  - Deterministic ATS score delta: overall score after optimization must
    be strictly higher than before (a real, checkable number — no judge
    needed for "did the score go up").
  - Deterministic keyword-gap closure: the previously-missing keyword the
    optimizer was told about must actually appear in the optimized resume
    text, not just be claimed in `addedKeywords`.
  - GEval "FaithfulOptimization": the optimized content must not fabricate
    employers, job titles, dates, or credentials absent from the original
    resume — the optimizer must add the missing skill truthfully (e.g. via
    a plausible existing-role bullet or a clearly-added skill), not invent
    a new job to justify it.
"""

from __future__ import annotations

import json

import pytest
from deepeval import assert_test
from deepeval.metrics import GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from app.agents.ats_agent import ATSScoringAgent
from app.agents.resume_optimizer_agent import ResumeOptimizerAgent
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
def ats_before(ai_provider):
    return ATSScoringAgent(ai_provider).run(RESUME_TEXT, JOB_DESCRIPTION)


@pytest.fixture(scope="module")
def optimized(ai_provider, ats_before):
    agent = ResumeOptimizerAgent(ai_provider)
    return agent.run(
        resume_content=RESUME_TEXT,
        missing_keywords=ats_before.missingKeywords,
        suggestions=ats_before.suggestions,
        job_description=JOB_DESCRIPTION,
    )


@pytest.fixture(scope="module")
def optimized_text(optimized):
    content = optimized.optimizedContent
    return content if isinstance(content, str) else json.dumps(content, ensure_ascii=False)


@pytest.fixture(scope="module")
def ats_after(ai_provider, optimized_text):
    return ATSScoringAgent(ai_provider).run(optimized_text, JOB_DESCRIPTION)


def test_ats_overall_score_improves_after_optimization(ats_before, ats_after):
    assert ats_after.overall > ats_before.overall, (
        f"Optimizer did not improve the ATS score: before={ats_before.overall}, "
        f"after={ats_after.overall}. An optimization pass that doesn't raise the "
        f"score against the same job description is not doing its job."
    )


def test_missing_keyword_is_actually_added_to_resume_text(optimized_text):
    assert "kubernetes" in optimized_text.lower(), (
        "The ATS agent flagged 'Kubernetes' as missing, but the optimizer's "
        "optimizedContent still doesn't mention it — claiming a fix via "
        "addedKeywords is not enough if the resume text itself is unchanged."
    )


@pytest.mark.evaluation
def test_optimization_does_not_fabricate_experience(optimized_text, judge_model):
    faithfulness_metric = GEval(
        name="FaithfulOptimization",
        model=judge_model,
        threshold=GEVAL_THRESHOLD,
        evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "The 'input' is the original resume, which mentions exactly one employer "
            "(Acme Corp), one role (Backend Developer), and one duration (3 years).",
            "The 'actual_output' is the optimized resume, which was asked to add "
            "Kubernetes-related content to close a keyword gap.",
            "Penalize heavily if the optimized resume introduces a new employer, job "
            "title, academic degree, or certification that was not present in the "
            "original — e.g. inventing a second job or a Kubernetes certification "
            "that was never mentioned.",
            "Do not penalize the optimizer for rephrasing existing bullets, adding "
            "Kubernetes to the skills list, or plausibly extending an existing Acme "
            "Corp bullet point to mention Kubernetes-adjacent responsibilities.",
        ],
    )
    test_case = LLMTestCase(
        input=RESUME_TEXT,
        actual_output=optimized_text,
    )
    assert_test(test_case, [faithfulness_metric])
