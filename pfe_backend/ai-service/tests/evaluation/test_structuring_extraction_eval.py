"""Evaluates StructuringAgent (LangGraph matching pipeline's "structure" node)
for both the candidate CV and the job offer.

Detects: incorrect extraction (skills invented that aren't in the source
text, or skills present in the text that get dropped), and misinterpretation
of a job offer's requirements.

Metrics:
  - A deterministic assertion for the spec's concrete example: a CV that
    never mentions "Kubernetes" must not come out of structuring with
    "Kubernetes" in skillsRaw.
  - Contextual Precision: of the skills the agent extracted, how many are
    actually supported by the CV/job text (catches invented skills).
  - Contextual Recall: of the skills actually present in the CV/job text,
    how many did the agent extract (catches dropped/missed skills).
  Both are exactly DeepEval's intended use case for a retrieval/extraction
  step judged against its source document — Answer Relevancy or
  Faithfulness don't fit as well here since there's no "answer to a
  question", just structured extraction from a document.
"""

from __future__ import annotations

import asyncio
import json

import pytest
from deepeval import assert_test
from deepeval.metrics import ContextualPrecisionMetric, ContextualRecallMetric
from deepeval.test_case import LLMTestCase

from app.agents.matching.structuring import StructuringAgent
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from tests.evaluation.thresholds import CONTEXTUAL_PRECISION_THRESHOLD, CONTEXTUAL_RECALL_THRESHOLD

CV_TEXT = """
Alex Martin - Backend Developer
3 years of experience building REST APIs.

Experience:
- Backend Developer at Acme Corp (2022 - Present)
  Built and maintained REST APIs in Python (FastAPI) and PostgreSQL. Used Git for version control.

Education:
- MSc Computer Science, Sorbonne (2021)

Skills: Python, FastAPI, PostgreSQL, Git
Languages: French (native), English (fluent)
""".strip()

JOB_TEXT = """
Senior Backend Engineer - Platform Team

We need a senior backend engineer with 5+ years of experience, strong in
Python and Django, who can own our PostgreSQL data layer. Experience with
Kubernetes is a plus but not required. No frontend work is involved.
""".strip()


@pytest.fixture(scope="module")
def structured_candidate(ai_provider):
    agent = StructuringAgent(ai_provider)
    candidate = CandidateProfileSchema(rawText=CV_TEXT)
    return asyncio.run(agent.run_candidate(candidate, CV_TEXT))


@pytest.fixture(scope="module")
def structured_job(ai_provider):
    agent = StructuringAgent(ai_provider)
    job_offer = JobOfferSchema(rawText=JOB_TEXT)
    return asyncio.run(agent.run_job_offer(job_offer, JOB_TEXT))


def test_candidate_structuring_does_not_invent_kubernetes(structured_candidate):
    """The CV never mentions Kubernetes: structuring must not add it."""
    skills_lower = [s.lower() for s in structured_candidate.skillsRaw]
    assert "kubernetes" not in skills_lower, (
        f"StructuringAgent hallucinated 'Kubernetes' into skillsRaw, but the CV never mentions it. "
        f"Extracted skills: {structured_candidate.skillsRaw}"
    )


def test_candidate_structuring_keeps_actual_skills(structured_candidate):
    skills_lower = {s.lower() for s in structured_candidate.skillsRaw}
    for expected in ("python", "fastapi", "postgresql"):
        assert expected in skills_lower, (
            f"StructuringAgent dropped '{expected}', which is explicitly listed in the CV. "
            f"Extracted skills: {structured_candidate.skillsRaw}"
        )


def test_job_structuring_does_not_require_optional_kubernetes(structured_job):
    """The offer explicitly says Kubernetes is "a plus but not required" —
    structuring must not misinterpret it as a hard requirement."""
    required_lower = [s.lower() for s in structured_job.requiredSkillsRaw]
    assert "kubernetes" not in required_lower, (
        "StructuringAgent misread an optional 'nice to have' (Kubernetes) as a required skill. "
        f"requiredSkillsRaw: {structured_job.requiredSkillsRaw}"
    )


def test_job_structuring_does_not_invent_frontend_requirement(structured_job):
    """The offer explicitly says "no frontend work" — structuring must not
    add frontend skills/requirements that contradict the source text."""
    all_text = " ".join(structured_job.requiredSkillsRaw + structured_job.niceToHaveSkillsRaw).lower()
    for bogus in ("react", "frontend", "css", "html"):
        assert bogus not in all_text, (
            f"StructuringAgent invented a frontend requirement ('{bogus}') the job offer explicitly excludes."
        )


@pytest.mark.evaluation
def test_candidate_structuring_contextual_precision_and_recall(structured_candidate, judge_model):
    extracted = ", ".join(structured_candidate.skillsRaw) or "(none extracted)"
    test_case = LLMTestCase(
        input="Extract the candidate's skills from this CV.",
        actual_output=extracted,
        expected_output="Python, FastAPI, PostgreSQL, Git",
        retrieval_context=[CV_TEXT],
    )
    precision = ContextualPrecisionMetric(threshold=CONTEXTUAL_PRECISION_THRESHOLD, model=judge_model, include_reason=True)
    recall = ContextualRecallMetric(threshold=CONTEXTUAL_RECALL_THRESHOLD, model=judge_model, include_reason=True)
    assert_test(test_case, [precision, recall])
