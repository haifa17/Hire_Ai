from __future__ import annotations

import pytest

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.certifications import score_certifications
from app.agents.matching.rule_based.education import score_education
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy
from app.agents.matching.rule_based.experience import score_experience
from app.agents.matching.rule_based.languages import score_languages
from app.agents.matching.rule_based.normalize import fuzzy_overlap, normalize_to_esco
from app.agents.matching.rule_based.projects import score_projects
from app.agents.matching.rule_based.skills import score_skills
from app.config.settings import get_settings
from app.schemas.matching import (
    CandidateProfileSchema,
    EducationSchema,
    IdentitySchema,
    JobOfferSchema,
    LanguageSchema,
)


@pytest.fixture
def settings():
    return get_settings()


@pytest.fixture
def normalizer(settings):
    return NormalizationAgent(settings)


@pytest.fixture
def empty_esco(tmp_path):
    # No skills.csv/occupations.csv present -> falls back to the custom taxonomy
    return EscoTaxonomy(str(tmp_path))


def test_score_skills_exact_match(empty_esco, normalizer):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), skillsRaw=["python", "fastapi"])
    job_offer = JobOfferSchema(title="Dev", requiredSkillsRaw=["python"])
    result = score_skills(candidate, job_offer, empty_esco, normalizer)
    assert result.score == 1.0
    assert "python" in result.matched


def test_score_skills_no_requirement_is_unavailable(empty_esco, normalizer):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev")
    result = score_skills(candidate, job_offer, empty_esco, normalizer)
    assert result.score is None
    assert result.details["reason"] == "no_required_skills"


def test_score_experience_ratio_capped_at_one(empty_esco):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), totalExperienceYears=10)
    job_offer = JobOfferSchema(title="Dev", requiredExperienceYears=3)
    result = score_experience(candidate, job_offer)
    # ratio (10/3 ≈ 3.33) exceeds the 3.0 over-qualification threshold -> capped
    assert result.score == 0.7


def test_score_experience_no_requirement_scores_full():
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), totalExperienceYears=0)
    job_offer = JobOfferSchema(title="Dev", requiredExperienceYears=0)
    result = score_experience(candidate, job_offer)
    assert result.score == 1.0
    assert result.details["reason"] == "no_experience_requirement"


def test_score_experience_candidate_data_unavailable_is_real_zero():
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), totalExperienceYears=0)
    job_offer = JobOfferSchema(title="Dev", requiredExperienceYears=3)
    result = score_experience(candidate, job_offer)
    assert result.score == 0.0


def test_score_experience_below_overqualification_threshold_not_capped():
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), totalExperienceYears=5)
    job_offer = JobOfferSchema(title="Dev", requiredExperienceYears=3)
    result = score_experience(candidate, job_offer)
    assert result.score == 1.0  # ratio 1.67, min(ratio, 1.0) = 1.0, below 3.0 threshold


def test_score_education_overqualification_capped(normalizer):
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"),
        education=[EducationSchema(degree="Doctorat", institution="X", year="2020")],
    )
    job_offer = JobOfferSchema(title="Dev", educationLevel="high school")
    result = score_education(candidate, job_offer, normalizer)
    # doctorat rank (5) vs high school rank (1) -> ratio 5.0 > 3.0 -> level capped at 0.7
    assert result.details["levelScore"] == 0.7


def test_score_languages_partial_overlap(normalizer):
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"),
        languages=[LanguageSchema(language="English", level="fluent")],
    )
    job_offer = JobOfferSchema(title="Dev", languages=["English", "French"])
    result = score_languages(candidate, job_offer, normalizer)
    assert 0 < result.score < 1.0
    assert "french" in result.missing


def test_score_education_higher_rank_scores_full_level(normalizer):
    candidate = CandidateProfileSchema(
        identity=IdentitySchema(name="A"),
        education=[EducationSchema(degree="Master", institution="X", year="2020")],
    )
    job_offer = JobOfferSchema(title="Dev", educationLevel="bachelor")
    result = score_education(candidate, job_offer, normalizer)
    assert result.details["levelScore"] == 1.0


def test_score_certifications_uses_real_required_field(empty_esco):
    """Regression test: `JobOfferSchema.requiredCertifications` must actually
    be read (previously a nonexistent field was probed via getattr, so this
    criterion was permanently a no-op neutral 1.0 for every real job offer)."""
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"), certifications=["AWS Certified Developer"])
    job_offer_with_req = JobOfferSchema(title="Dev", requiredCertifications=["AWS Certified Developer", "PMP"])
    result = score_certifications(candidate, job_offer_with_req)
    assert result.score == pytest.approx(0.5)
    assert "PMP" in result.missing

    job_offer_no_req = JobOfferSchema(title="Dev")
    unavailable = score_certifications(candidate, job_offer_no_req)
    assert unavailable.score is None
    assert unavailable.details["reason"] == "no_certification_requirement"


def test_score_certifications_missing_when_candidate_has_none(empty_esco):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev", requiredCertifications=["PMP"])
    result = score_certifications(candidate, job_offer)
    assert result.score == 0.0
    assert result.missing == ["PMP"]


def test_score_languages_no_requirement_is_unavailable(normalizer):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev")
    result = score_languages(candidate, job_offer, normalizer)
    assert result.score is None
    assert result.details["reason"] == "no_language_requirement"


def test_score_projects_no_tech_stack_is_unavailable(empty_esco, normalizer):
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev")
    result = score_projects(candidate, job_offer, empty_esco, normalizer)
    assert result.score is None
    assert result.details["reason"] == "no_tech_stack_requirement"


def test_score_projects_no_extracted_tech_is_unavailable(empty_esco, normalizer):
    """Regression: absence of `skillsUsed` on any experience is an extraction
    gap, not proof the candidate has zero relevant tech (plan §4)."""
    candidate = CandidateProfileSchema(identity=IdentitySchema(name="A"))
    job_offer = JobOfferSchema(title="Dev", requiredSkillsRaw=["python"])
    result = score_projects(candidate, job_offer, empty_esco, normalizer)
    assert result.score is None
    assert result.details["reason"] == "no_project_tech_found"


def test_normalize_to_esco_falls_back_to_custom_taxonomy(empty_esco, normalizer):
    result = normalize_to_esco("NodeJS", empty_esco, normalizer)
    assert result.matched_via == "custom"
    assert result.canonical_label == "node.js"


def test_normalize_to_esco_empty_term(empty_esco, normalizer):
    result = normalize_to_esco("   ", empty_esco, normalizer)
    assert result.matched_via == "unmatched"
    assert result.canonical_label == ""


def test_fuzzy_overlap_one_candidate_skill_cannot_satisfy_two_required_skills(empty_esco, normalizer):
    """Regression test: the residual fuzzy pass must consume a candidate skill
    once it satisfies a required skill, so a single vague candidate term can't
    inflate the matched count against multiple required skills."""
    candidate_terms = ["programing"]  # deliberate typo, won't exact-match either required term
    required_terms = ["programming fundamentals", "programming basics"]

    matched, missing = fuzzy_overlap(candidate_terms, required_terms, empty_esco, normalizer, fuzzy_threshold=60)

    assert len(matched) + len(missing) == len(required_terms)
    # only one required term can be satisfied by the single candidate skill
    assert len(matched) <= 1


def test_fuzzy_overlap_exact_match_no_regression(empty_esco, normalizer):
    matched, missing = fuzzy_overlap(["python", "sql"], ["python"], empty_esco, normalizer)
    assert matched == ["python"]
    assert missing == []
