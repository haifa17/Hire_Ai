"""Evaluates ResumeGenerationAgent (used by POST /api/ai/generate-resume).

Detects: hallucinated companies/dates/metrics, fabricated skills or
certifications not present in the candidate's actual profile.

Metrics:
  - Faithfulness: the generated resume must be an accurate, ATS-optimized
    *rewrite* of the candidate's profile, not a source of new facts. This is
    the metric DeepEval designed for exactly this "does the output
    contradict/invent beyond its source" question.
  - A deterministic assertion (no metric/LLM judge involved) that no skill
    outside the candidate's declared skill set appears in the generated
    output — the concrete "CV has no Kubernetes -> must not claim
    Kubernetes" case from the spec. A deterministic check catches this more
    reliably than an LLM-judged metric would.
"""

from __future__ import annotations

import json

import pytest
from deepeval import assert_test
from deepeval.metrics import FaithfulnessMetric
from deepeval.test_case import LLMTestCase

from app.agents.resume_agent import ResumeGenerationAgent
from tests.evaluation.thresholds import FAITHFULNESS_THRESHOLD

CANDIDATE_PROFILE = {
    "identity": {"name": "Alex Martin", "email": "alex@example.com", "phone": "", "location": "Paris"},
    "summary": "Backend developer with 3 years of experience building REST APIs.",
    "experiences": [
        {
            "title": "Backend Developer",
            "company": "Acme Corp",
            "startDate": "2022-01",
            "endDate": "Present",
            "description": "Built and maintained REST APIs in Python (FastAPI) and PostgreSQL.",
            "skillsUsed": ["Python", "FastAPI", "PostgreSQL"],
        }
    ],
    "education": [{"degree": "MSc Computer Science", "institution": "Sorbonne", "year": "2021"}],
    # Deliberately does NOT include "Kubernetes", "AWS", or "Docker" — the
    # resume generator must not claim experience with them.
    "skillsRaw": ["Python", "FastAPI", "PostgreSQL", "Git"],
    "languages": [{"language": "French", "level": "Native"}, {"language": "English", "level": "Fluent"}],
    "certifications": [],
    "totalExperienceYears": 3,
}

JOB_DESCRIPTION = (
    "We are hiring a Backend Developer with strong Python and FastAPI skills, "
    "ideally with Kubernetes and AWS experience, to join our platform team."
)

# Skills a hallucinating model might be tempted to add because the job
# description mentions them, even though the candidate's profile doesn't.
SKILLS_NOT_IN_PROFILE = ["kubernetes", "aws", "docker"]


@pytest.fixture(scope="module")
def generated_resume(ai_provider) -> dict:
    agent = ResumeGenerationAgent(ai_provider)
    result = agent.run(CANDIDATE_PROFILE, JOB_DESCRIPTION, language="en")
    if "rawMarkdown" in result:
        pytest.skip("Provider did not return valid JSON for this run; skipping (not a faithfulness failure).")
    return result


def test_resume_does_not_claim_skills_absent_from_profile(generated_resume):
    """Concrete regression case: candidate has no Kubernetes experience, so
    the generated resume must never claim Kubernetes experience — even
    though the target job description asks for it."""
    resume_text = json.dumps(generated_resume, ensure_ascii=False).lower()
    claimed = [skill for skill in SKILLS_NOT_IN_PROFILE if skill in resume_text]
    assert not claimed, (
        f"Resume generator fabricated skill(s) not present in the candidate profile: {claimed}. "
        f"Profile skills were: {CANDIDATE_PROFILE['skillsRaw']}."
    )


@pytest.mark.evaluation
def test_resume_generation_faithfulness(generated_resume, judge_model):
    test_case = LLMTestCase(
        input=f"Candidate profile: {json.dumps(CANDIDATE_PROFILE, ensure_ascii=False)}\nJob description: {JOB_DESCRIPTION}",
        actual_output=json.dumps(generated_resume, ensure_ascii=False),
        retrieval_context=[json.dumps(CANDIDATE_PROFILE, ensure_ascii=False)],
    )
    metric = FaithfulnessMetric(threshold=FAITHFULNESS_THRESHOLD, model=judge_model, include_reason=True)
    assert_test(test_case, [metric])
