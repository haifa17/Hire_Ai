"""Evaluates ExplainabilityAgent (LangGraph matching pipeline's "explain" node).

Detects: explanations that are incoherent with the numeric score breakdown
they're supposed to justify (e.g. praising a low score, or claiming a skill
match that the breakdown/matched-skills list contradicts), and explanations
that drift into generic, irrelevant filler.

Metrics:
  - Custom GEval "ScoreExplanationConsistency": there is no built-in DeepEval
    metric for "does this text agree with these specific numbers", so this
    uses GEval with an explicit rubric — the right tool per DeepEval's docs
    for a criterion that isn't one of the standard RAG metrics.
  - Answer Relevancy: the explanation must actually address the candidate/job
    pairing it was generated for, not generic HR boilerplate.
"""

from __future__ import annotations

import asyncio

import pytest
from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric, GEval
from deepeval.test_case import LLMTestCase, SingleTurnParams

from app.agents.matching.explainability import ExplainabilityAgent
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from app.schemas.scoring import UnifiedBreakdownSchema
from tests.evaluation.thresholds import ANSWER_RELEVANCY_THRESHOLD, GEVAL_THRESHOLD

CANDIDATE = CandidateProfileSchema(
    summary="Junior designer with 1 year of Photoshop/Illustrator experience.",
    skillsRaw=["Photoshop", "Illustrator"],
    totalExperienceYears=1,
)
JOB_OFFER = JobOfferSchema(
    title="Senior Backend Engineer",
    requiredSkillsRaw=["Python", "FastAPI", "PostgreSQL"],
    requiredExperienceYears=5,
)
# A deliberately weak match: low scores (0-1 scale) across every criterion.
LOW_BREAKDOWN = UnifiedBreakdownSchema(
    skills=0.05,
    experience=0.10,
    semantic=0.15,
    education=0.20,
    projects=0.0,
    languages=0.50,
    certifications=None,
)


@pytest.fixture(scope="module")
def low_match_explanation(ai_provider):
    agent = ExplainabilityAgent(ai_provider)
    return asyncio.run(
        agent.explain(
            candidate=CANDIDATE,
            job_offer=JOB_OFFER,
            breakdown=LOW_BREAKDOWN,
            strengths=[],
            gaps=["No Python/FastAPI/PostgreSQL experience", "5 years experience gap"],
            matched_skills=[],
            missing_skills=["Python", "FastAPI", "PostgreSQL"],
            language="en",
        )
    )


def test_low_score_explanation_does_not_claim_a_strong_match(low_match_explanation):
    """Deterministic guard: with every breakdown dimension near-zero, the
    explanation must not describe the match as strong/excellent/perfect —
    that would directly contradict the score it's explaining."""
    text_lower = low_match_explanation.lower()
    contradicting_phrases = ["excellent match", "strong match", "perfect fit", "highly qualified", "great fit"]
    hits = [p for p in contradicting_phrases if p in text_lower]
    assert not hits, (
        f"Explanation contradicts a near-zero score breakdown by using: {hits}. "
        f"Explanation was: {low_match_explanation!r}"
    )


@pytest.mark.evaluation
def test_explanation_consistent_with_score_breakdown(low_match_explanation, judge_model):
    consistency_metric = GEval(
        name="ScoreExplanationConsistency",
        model=judge_model,
        threshold=GEVAL_THRESHOLD,
        evaluation_params=[SingleTurnParams.INPUT, SingleTurnParams.ACTUAL_OUTPUT],
        evaluation_steps=[
            "The 'input' contains a numeric score breakdown (0-1 per criterion) and a list of missing skills.",
            "Check whether the 'actual_output' explanation is consistent with those numbers: a low score "
            "(most criteria under 0.3) must be described as a weak/poor match, not a strong one.",
            "Check that skills listed as 'missing' in the input are not described as strengths or matched "
            "skills in the explanation.",
            "Penalize heavily if the explanation's tone contradicts the numeric evidence given.",
        ],
    )
    test_case = LLMTestCase(
        input=(
            f"Score breakdown: {LOW_BREAKDOWN.model_dump_json()}. "
            f"Missing skills: Python, FastAPI, PostgreSQL."
        ),
        actual_output=low_match_explanation,
    )
    assert_test(test_case, [consistency_metric])


@pytest.mark.evaluation
def test_explanation_answer_relevancy(low_match_explanation, judge_model):
    test_case = LLMTestCase(
        input=(
            f"Explain the match score between a candidate ({CANDIDATE.summary}) and a job "
            f"offer ({JOB_OFFER.title}, requires {JOB_OFFER.requiredSkillsRaw})."
        ),
        actual_output=low_match_explanation,
    )
    metric = AnswerRelevancyMetric(threshold=ANSWER_RELEVANCY_THRESHOLD, model=judge_model, include_reason=True)
    assert_test(test_case, [metric])
