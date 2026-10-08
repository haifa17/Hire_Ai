"""Evaluates ranking quality of the unified scoring engine — the same
`compute_unified_score()` used by both the matching pipeline
(orchestrator/graph.py) and the recommendation pipeline
(recommendation_pipeline.py) to rank job offers for a candidate.

Every other test around this engine (tests/test_unified_engine.py) checks
that individual scores land in a sane range for one candidate/job pair.
None of them check the thing that actually matters for a ranked list of
recommendations: given several job offers of *known, graded relevance* to
one candidate, does the engine rank the clearly-relevant one above the
partially-relevant one above the irrelevant one?

This is deliberately NOT an LLM-judge eval — relevance here is a designed
ground truth (we built the candidate and job offers ourselves), so ranking
quality against it is a deterministic, checkable metric, not a matter of
judgment. It lives under tests/evaluation/ (run explicitly, like the other
eval tests) rather than tests/ because it's evaluating the engine's
*quality* against a labeled set, not a unit of its logic.

Metrics:
  - Tiered ranking correctness: the two genuinely skill-relevant offers must
    both outrank the two zero-skill-overlap offers. This test intentionally
    runs without an embedding_provider (no semantic engine), matching how
    it's fast/offline-runnable in CI — which means it can only assert what
    pure rule-based scoring can actually see. With zero keyword overlap on
    both "weakly_relevant" (Frontend) and "irrelevant" (Nurse), the engine
    has no signal to tell "wrong domain" from "very wrong domain" apart, so
    this test does NOT assert a strict order between those two — only that
    neither one leaks into the relevant tier. (A full-signal version of this
    test, with the semantic engine wired in, would be expected to separate
    them further; that's a natural follow-up once a fixture for loading the
    embedding model in tests exists.)
  - Precision@2: of the top 2 ranked job offers, both must be from the
    "relevant" set (highly_relevant + partially_relevant), i.e. no
    irrelevant/wrong-domain offer should out-rank a genuinely relevant one.
  - Score separation: the score gap between the least relevant and most
    relevant offer must be large enough (>= 0.25 on the 0-1 scale) that the
    ranking isn't a coin flip on noisy near-ties.
"""

from __future__ import annotations

import pytest

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy
from app.agents.scoring.unified_engine import compute_unified_score
from app.config.settings import get_settings
from app.schemas.matching import (
    CandidateProfileSchema,
    EducationSchema,
    ExperienceSchema,
    IdentitySchema,
    JobOfferSchema,
)

MIN_SCORE_SEPARATION = 0.25


@pytest.fixture(scope="module")
def settings():
    return get_settings()


@pytest.fixture(scope="module")
def normalizer(settings):
    return NormalizationAgent(settings)


@pytest.fixture(scope="module")
def empty_esco(tmp_path_factory):
    return EscoTaxonomy(str(tmp_path_factory.mktemp("esco")))


@pytest.fixture(scope="module")
def candidate():
    """A mid-level Python/backend candidate — the fixed point every job
    offer below is scored against."""
    return CandidateProfileSchema(
        identity=IdentitySchema(name="Alex Martin"),
        skillsRaw=["python", "fastapi", "postgresql", "docker", "git"],
        totalExperienceYears=4.0,
        experiences=[
            ExperienceSchema(
                title="Backend Developer",
                company="Acme Corp",
                description="Built REST APIs in Python using FastAPI and PostgreSQL.",
                skillsUsed=["python", "fastapi", "postgresql"],
            )
        ],
        education=[EducationSchema(degree="Master", institution="X", year="2020")],
        languages=[],
        certifications=[],
    )


# Job offers with a *designed* graded relevance to `candidate`, ordered
# highest-relevance first. The ranking produced by compute_unified_score
# is expected to reproduce this order.
JOB_OFFERS = {
    "highly_relevant": JobOfferSchema(
        title="Python Backend Developer",
        requiredSkillsRaw=["python", "fastapi", "postgresql"],
        requiredExperienceYears=3.0,
        educationLevel="bachelor",
    ),
    "partially_relevant": JobOfferSchema(
        title="Backend Developer (Java)",
        requiredSkillsRaw=["java", "spring", "postgresql"],
        requiredExperienceYears=3.0,
        educationLevel="bachelor",
    ),
    "weakly_relevant": JobOfferSchema(
        title="Frontend Developer",
        requiredSkillsRaw=["react", "typescript", "css"],
        requiredExperienceYears=4.0,
        educationLevel="bachelor",
    ),
    "irrelevant": JobOfferSchema(
        title="Registered Nurse",
        requiredSkillsRaw=["patient care", "clinical documentation", "phlebotomy"],
        requiredExperienceYears=2.0,
        educationLevel="bachelor",
    ),
}

RELEVANT_SET = {"highly_relevant", "partially_relevant"}


@pytest.fixture(scope="module")
def scores(candidate, settings, normalizer, empty_esco):
    result = {}
    for label, job_offer in JOB_OFFERS.items():
        unified = compute_unified_score(candidate, job_offer, settings, normalizer, empty_esco)
        assert unified.overall is not None, f"'{label}' produced no overall score at all"
        result[label] = unified.overall
    return result


def test_relevant_tier_outranks_irrelevant_tier(scores):
    min_relevant = min(scores[label] for label in RELEVANT_SET)
    max_irrelevant = max(scores[label] for label in scores if label not in RELEVANT_SET)
    assert min_relevant > max_irrelevant, (
        f"Every skill-relevant offer should outrank every zero-overlap offer, but "
        f"the weakest relevant score ({min_relevant:.3f}) does not exceed the "
        f"strongest irrelevant score ({max_irrelevant:.3f}). Scores: {scores}"
    )


def test_highly_relevant_outranks_partially_relevant(scores):
    assert scores["highly_relevant"] > scores["partially_relevant"], (
        f"The offer matching the candidate's exact stack should outrank the "
        f"offer sharing only one skill. Scores: {scores}"
    )


def test_precision_at_2_has_no_irrelevant_offer_in_top_2(scores):
    top_2 = sorted(scores, key=lambda label: scores[label], reverse=True)[:2]
    off_topic = [label for label in top_2 if label not in RELEVANT_SET]
    assert not off_topic, (
        f"Top-2 ranked offers include non-relevant offer(s) {off_topic} "
        f"(scores: {scores}) — a candidate would see an irrelevant recommendation "
        f"outrank a genuinely relevant one."
    )


def test_score_separation_between_best_and_worst_is_meaningful(scores):
    best = scores["highly_relevant"]
    worst = scores["irrelevant"]
    gap = best - worst
    assert gap >= MIN_SCORE_SEPARATION, (
        f"Score gap between the highly relevant offer ({best:.3f}) and the "
        f"irrelevant offer ({worst:.3f}) is only {gap:.3f}, below the "
        f"{MIN_SCORE_SEPARATION} margin — the ranking would be too noisy to "
        f"trust in production."
    )
