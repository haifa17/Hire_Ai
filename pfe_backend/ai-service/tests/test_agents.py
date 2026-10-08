from __future__ import annotations

import pytest

from app.agents.matching.embedding import EmbeddingAgent
from app.agents.matching.explainability import ExplainabilityAgent
from app.agents.matching.extraction import ExtractionAgent
from app.agents.matching.matching import MatchingAgent
from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.structuring import StructuringAgent
from app.config.settings import get_settings
from app.schemas.matching import CandidateProfileSchema, IdentitySchema, JobOfferSchema
from app.schemas.scoring import UnifiedBreakdownSchema


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
def mock_provider():
    class MockProvider:
        def generate(self, prompt: str, json_mode: bool = True) -> str:
            if "compliance" in prompt or "Bias" in prompt:
                return '{"flagged": false, "reason": "No bias detected"}'
            if "JSON" in prompt or json_mode:
                return '{"summary": "Test parsed resume summary"}'
            return "Professional explanation of matching score."
    return MockProvider()


@pytest.mark.asyncio
async def test_extraction_agent(mock_provider):
    agent = ExtractionAgent(mock_provider)
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="John Doe", location="Rabat"),
        rawText="Experienced Software Engineer with Python skills",
    )
    doc = await agent.run_candidate(candidate)
    assert doc.text is not None
    assert doc.confidence > 0.0


@pytest.mark.asyncio
async def test_extraction_agent_uses_safe_source_file(monkeypatch, tmp_path):
    resume_file = tmp_path / "resume.pdf"
    resume_file.write_bytes(b"%PDF test placeholder")
    monkeypatch.setenv("AI_ALLOWED_UPLOAD_ROOTS", str(tmp_path))

    agent = ExtractionAgent()
    monkeypatch.setattr(
        agent,
        "_try_file_extraction",
        lambda path: ("Python FastAPI resume extracted from file", 0.9),
    )

    candidate = CandidateProfileSchema(sourceFile=str(resume_file))
    doc = await agent.run_candidate(candidate)

    assert doc.text == "Python FastAPI resume extracted from file"
    assert doc.confidence == 0.9


@pytest.mark.asyncio
async def test_structuring_agent(mock_provider):
    agent = StructuringAgent(mock_provider)
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="John Doe"),
    )
    res = await agent.run_candidate(candidate, "Raw resume text containing python")
    assert res.identity.name == "John Doe"


@pytest.mark.asyncio
async def test_normalization_agent(settings):
    agent = NormalizationAgent(settings)
    assert agent.canonical_skill("JS") == "javascript"
    assert agent.canonical_skill("NodeJS") == "node.js"
    assert agent.education_rank("bachelor") == 3
    assert agent.education_rank("Bac+5") == 4
    assert agent.education_rank("Licence") == 3
    assert agent.education_rank("Diplôme d'ingénieur") == 4
    assert agent.education_rank("Doctorat en IA") == 5
    assert agent.education_rank("high school") == 1


def test_embedding_agent(settings):
    agent = EmbeddingAgent(settings)
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="John Doe"),
        skillsRaw=["python", "fastapi"],
    )
    job_offer = JobOfferSchema(
        title="Python Developer",
        requiredSkillsRaw=["python"],
    )
    v1 = agent.embed_candidate(candidate, store=False)
    v2 = agent.embed_job_offer(job_offer, store=False)
    sim = agent.similarity(v1, v2)
    assert 0.0 <= sim <= 1.0


def test_matching_agent(settings):
    agent = MatchingAgent(settings)
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="John Doe"),
        skillsRaw=["python", "fastapi"],
        totalExperienceYears=5.0,
        experiences=[
            {"title": "Senior Python Developer", "company": "Test Company", "description": "Writing Python code"}
        ],
        summary="Experienced engineer working with python."
    )
    job_offer = JobOfferSchema(
        title="Senior Python Engineer",
        requiredSkillsRaw=["python"],
        requiredExperienceYears=3.0,
    )
    computation = agent.compute(candidate, job_offer)
    assert computation.breakdown.skills is not None and computation.breakdown.skills > 0
    # Matched as "python" against the legacy custom taxonomy, or canonicalized
    # to its ESCO label (e.g. "Python (computer programming)") when the real
    # ESCO reference data is present under data/esco/ (see data/esco/README.md)
    # — either is correct; assert on intent (python matched), not on which
    # taxonomy happens to be loaded in this environment.
    assert any("python" in skill.lower() for skill in computation.matched_skills), (
        f"Expected a Python skill match, got: {computation.matched_skills}"
    )
    assert computation.unified.per_criterion["skills"].score > 0
    assert computation.final_score_0_100 is not None
    assert 0 <= computation.final_score_0_100 <= 100

    # Test junior candidate against a job with no experience requirement:
    # experience always resolves to a real score (never "not evaluated" in
    # the UI) — no requirement stated means full marks on this criterion.
    candidate_junior = CandidateProfileSchema(
        identity=IdentitySchema(name="Junior Doe"),
        totalExperienceYears=0.0
    )
    job_offer_entry = JobOfferSchema(
        title="Entry Level Python Dev",
        requiredExperienceYears=0.0
    )
    computation_junior = agent.compute(candidate_junior, job_offer_entry)
    assert computation_junior.breakdown.experience == 1.0
    assert "experience" not in computation_junior.unavailable_criteria


@pytest.mark.asyncio
async def test_explainability_agent(mock_provider):
    agent = ExplainabilityAgent(mock_provider)
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="John Doe"))
    job_offer = JobOfferSchema(title="Dev")
    breakdown = UnifiedBreakdownSchema(
        skills=0.9,
        experience=0.9,
        semantic=0.8,
        education=1.0,
        projects=0.8,
        languages=1.0,
        certifications=1.0,
    )
    exp = await agent.explain(candidate, job_offer, breakdown, [], [], [], [], "en")
    assert exp == "Professional explanation of matching score."
