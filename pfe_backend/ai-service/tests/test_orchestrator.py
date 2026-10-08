from __future__ import annotations

from unittest.mock import AsyncMock, patch
import pytest

from app.config.settings import get_settings
from app.orchestrator.graph import MatchingGraph
from app.schemas.matching import (
    CandidateProfileSchema,
    IdentitySchema,
    JobOfferSchema,
    MatchingResultSchema,
    MatchingRunRequest,
)
from app.schemas.scoring import UnifiedBreakdownSchema


@pytest.fixture
def mock_provider():
    class MockProvider:
        def generate(self, prompt: str, json_mode: bool = True) -> str:
            if "compliance" in prompt or "Bias" in prompt:
                return '{"flagged": false, "reason": "No bias detected"}'
            if "JSON" in prompt or json_mode:
                return '{}'
            return "Professional explanation of matching score."
    return MockProvider()


@pytest.mark.asyncio
async def test_matching_graph_pipeline(mock_provider):
    settings = get_settings()
    
    # Mock database session to prevent actual connection attempts
    with patch("app.orchestrator.graph.AsyncSessionLocal") as mock_session_class:
        mock_db = AsyncMock()
        mock_session_class.return_value.__aenter__.return_value = mock_db
        
        graph = MatchingGraph(settings, mock_provider)
        # This is a unit test, not an integration test against real Redis — if a
        # local Redis happens to be running, MatchingResultCache would connect to
        # it for real and a cache hit from a previous run (same candidate/job ids)
        # would skip the pipeline entirely, making `mock_session_class.called`
        # flaky/order-dependent. Force it to behave as if Redis is unavailable.
        graph.result_cache.client = None

        candidate = CandidateProfileSchema(
            id="c39b2b52-78d1-4ad9-bfbe-d45c613054f2",
            identity=IdentitySchema(name="John Doe", location="Casablanca"),
            rawText="Experienced Software Engineer with Python skills",
            skillsRaw=["python"],
        )
        job_offer = JobOfferSchema(
            id="a19b2b52-78d1-4ad9-bfbe-d45c613054f2",
            title="Python Developer",
            requiredSkillsRaw=["python"],
            rawText="Looking for a Python Developer in Casablanca",
        )

        req = MatchingRunRequest(candidate=candidate, jobOffer=job_offer, language="en")
        result = await graph.run_matching_pipeline(req)

        assert result.globalScore is not None
        assert result.globalScore >= 0
        assert "graph:start" in result.trace
        assert len(result.matchedSkills) > 0
        # No bias-audit node/penalty in the graph anymore.
        assert not hasattr(result, "audit")

        # Verify db interaction occurred
        assert mock_session_class.called


@pytest.mark.asyncio
async def test_rank_candidates_scores_all_candidates_before_slicing():
    graph = object.__new__(MatchingGraph)

    async def fake_run_matching_pipeline(request: MatchingRunRequest) -> MatchingResultSchema:
        score = 95 if "python" in request.candidate.skillsRaw else 10
        return MatchingResultSchema(
            candidateId=request.candidate.id,
            jobOfferId=request.jobOffer.id,
            globalScore=score,
            matchScore=score,
            score=score,
            atsScore=score,
            breakdown=UnifiedBreakdownSchema(skills=score / 100),
        )

    graph.run_matching_pipeline = fake_run_matching_pipeline
    candidates = [
        CandidateProfileSchema(id="11111111-1111-1111-1111-111111111111", skillsRaw=["java"]),
        CandidateProfileSchema(id="22222222-2222-2222-2222-222222222222", skillsRaw=["python"]),
    ]
    job_offer = JobOfferSchema(id="33333333-3333-3333-3333-333333333333", requiredSkillsRaw=["python"])

    ranked = await graph.rank_candidates(job_offer, candidates, "en", top_k=1)

    assert len(ranked) == 1
    assert ranked[0].candidate.id == "22222222-2222-2222-2222-222222222222"
    assert ranked[0].rank == 1
