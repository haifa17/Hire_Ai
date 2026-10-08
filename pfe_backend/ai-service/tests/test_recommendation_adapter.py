from __future__ import annotations

from app.agents.scoring import recommendation_adapter
from app.schemas.recommendation import CandidateFeatures, JobFeatures


def test_candidate_profile_from_payload_full_snapshot():
    payload = {
        "name": "Jane Doe",
        "skills": ["python", "fastapi"],
        "experience_years": 5.0,
        "location": "Casablanca",
        "certifications": ["AWS Certified Developer"],
        "languages": ["english"],
        "summary_text": "Backend engineer",
        "experiences_snapshot": [
            {"title": "Backend Dev", "company": "Acme", "description": "Built APIs", "skillsUsed": ["python"]}
        ],
        "education_snapshot": [{"degree": "Master", "institution": "X", "year": "2020"}],
    }
    profile = recommendation_adapter.candidate_profile_from_payload("cand-1", payload)
    assert profile.id == "cand-1"
    assert profile.skillsRaw == ["python", "fastapi"]
    assert len(profile.experiences) == 1
    assert profile.experiences[0].skillsUsed == ["python"]
    assert len(profile.education) == 1
    assert profile.education[0].degree == "Master"
    assert profile.languages[0].language == "english"


def test_candidate_profile_from_payload_degrades_gracefully_without_snapshot():
    """Old (pre-migration) Qdrant payloads won't carry the structured
    snapshot fields — the adapter must not crash, just come back empty."""
    payload = {
        "name": "Jane Doe",
        "skills": ["python"],
        "experience_years": 5.0,
    }
    profile = recommendation_adapter.candidate_profile_from_payload("cand-1", payload)
    assert profile.experiences == []
    assert profile.education == []
    assert profile.skillsRaw == ["python"]


def test_job_offer_from_payload_full_snapshot():
    payload = {
        "title": "Backend Developer",
        "company": "Acme",
        "required_skills": ["python"],
        "nice_to_have_skills": ["docker"],
        "required_certifications": ["AWS Certified Developer"],
        "experience_years": 3.0,
        "education_level": "bachelor",
        "languages": ["english"],
    }
    job = recommendation_adapter.job_offer_from_payload("job-1", payload)
    assert job.id == "job-1"
    assert job.requiredSkillsRaw == ["python"]
    assert job.niceToHaveSkillsRaw == ["docker"]
    assert job.requiredCertifications == ["AWS Certified Developer"]
    assert job.educationLevel == "bachelor"


def test_job_offer_from_payload_degrades_gracefully_without_snapshot():
    payload = {"title": "Backend Developer", "required_skills": ["python"]}
    job = recommendation_adapter.job_offer_from_payload("job-1", payload)
    assert job.requiredCertifications == []
    assert job.niceToHaveSkillsRaw == []


def test_candidate_profile_from_features_roundtrip():
    features = CandidateFeatures(
        candidate_id="cand-1",
        name="Jane",
        skills=["python"],
        experience_years=4.0,
        experiences_snapshot=[{"title": "Dev", "company": "X", "skillsUsed": ["python"]}],
        education_snapshot=[{"degree": "Bachelor", "institution": "Y", "year": "2019"}],
    )
    profile = recommendation_adapter.candidate_profile_from_features(features)
    assert profile.id == "cand-1"
    assert profile.experiences[0].title == "Dev"
    assert profile.education[0].degree == "Bachelor"


def test_job_offer_from_features_roundtrip():
    features = JobFeatures(
        job_id="job-1",
        title="Backend Developer",
        required_skills=["python"],
        nice_to_have_skills=["docker"],
        required_certifications=["PMP"],
    )
    job = recommendation_adapter.job_offer_from_features(features)
    assert job.id == "job-1"
    assert job.requiredSkillsRaw == ["python"]
    assert job.niceToHaveSkillsRaw == ["docker"]
    assert job.requiredCertifications == ["PMP"]
