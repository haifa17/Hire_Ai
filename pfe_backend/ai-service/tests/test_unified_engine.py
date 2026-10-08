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


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
def normalizer(settings):
    return NormalizationAgent(settings)


@pytest.fixture
def empty_esco(tmp_path):
    return EscoTaxonomy(str(tmp_path))


def test_all_criteria_present(settings, normalizer, empty_esco):
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"),
        skillsRaw=["python", "fastapi"],
        totalExperienceYears=4.0,
        experiences=[ExperienceSchema(title="Dev", company="X", description="Built APIs", skillsUsed=["python"])],
        education=[EducationSchema(degree="Master", institution="X", year="2020")],
        languages=[],
        certifications=["AWS Certified Developer"],
    )
    job_offer = JobOfferSchema(
        title="Python Developer",
        requiredSkillsRaw=["python"],
        requiredExperienceYears=3.0,
        educationLevel="bachelor",
        requiredCertifications=["AWS Certified Developer"],
    )
    result = compute_unified_score(candidate, job_offer, settings, normalizer, empty_esco)
    assert result.overall is not None
    assert 0.0 <= result.overall <= 1.0
    assert result.breakdown.skills is not None
    assert result.breakdown.experience is not None
    assert result.breakdown.education is not None
    assert result.breakdown.certifications is not None
    # No embedding provider passed -> semantic stays unavailable/None.
    assert result.breakdown.semantic is None
    assert "semantic" in result.unavailable_criteria


def test_some_criteria_none_renormalizes(settings, normalizer, empty_esco):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), skillsRaw=["python"])
    job_offer = JobOfferSchema(title="Dev", requiredSkillsRaw=["python"])
    # No experience/education/languages/certifications requirements set ->
    # experience/education always score a real value (never "not evaluated"
    # in the UI); languages/certifications/projects/semantic still come
    # back None here since they have no data on either side.
    result = compute_unified_score(candidate, job_offer, settings, normalizer, empty_esco)
    assert result.overall is not None
    assert result.breakdown.skills == 1.0
    assert result.breakdown.experience == 1.0
    assert result.breakdown.education == 1.0
    assert result.breakdown.languages is None
    assert result.breakdown.certifications is None
    assert set(result.unavailable_criteria) >= {"languages", "certifications", "semantic", "projects"}


def test_all_criteria_none_overall_is_none(settings, normalizer, empty_esco):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev")
    result = compute_unified_score(candidate, job_offer, settings, normalizer, empty_esco)
    # experience/education always resolve to a real "no requirement" score,
    # so overall is no longer None in the fully-empty case.
    assert result.overall is not None
    assert result.breakdown.experience == 1.0
    assert result.breakdown.education == 1.0
    assert result.breakdown.skills is None


def test_overqualification_triggers_on_experience_and_education(settings, normalizer, empty_esco):
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"),
        totalExperienceYears=15.0,
        education=[EducationSchema(degree="Doctorat", institution="X", year="2020")],
    )
    job_offer = JobOfferSchema(
        title="Dev",
        requiredExperienceYears=3.0,  # ratio 5.0 > 3.0
        educationLevel="high school",  # doctorat rank 5 vs rank 1, ratio 5.0 > 3.0
    )
    result = compute_unified_score(candidate, job_offer, settings, normalizer, empty_esco)
    assert result.breakdown.experience == 0.7
    assert result.per_criterion["education"].details["levelScore"] == 0.7
