from __future__ import annotations

import inspect

import pytest

from app.scripts.langsmith_eval_resume import (
    _ats_keyword_coverage,
    _content_completeness,
    _no_invented_companies,
    _no_placeholder_leftovers,
    _schema_completeness,
    _valid_json,
    build_resume_dataset,
    run_resume_evaluation,
)


@pytest.fixture(autouse=True)
def _no_langsmith_key(monkeypatch):
    monkeypatch.delenv("LANGSMITH_API_KEY", raising=False)
    from app.config import settings as settings_module
    settings_module.get_settings.cache_clear()
    yield
    settings_module.get_settings.cache_clear()


def test_build_dataset_requires_api_key():
    with pytest.raises(RuntimeError, match="LANGSMITH_API_KEY"):
        build_resume_dataset()


def test_run_eval_requires_api_key():
    with pytest.raises(RuntimeError, match="LANGSMITH_API_KEY"):
        run_resume_evaluation()


def test_valid_json_pass():
    assert _valid_json({"personalInfo": {}}, {})["score"] == 1.0


def test_valid_json_fail_raw_markdown():
    assert _valid_json({"rawMarkdown": "not json"}, {})["score"] == 0.0


def test_valid_json_fail_empty():
    assert _valid_json({}, {})["score"] == 0.0


def test_schema_completeness_full():
    outputs = {
        "personalInfo": {},
        "socialLinks": [],
        "professionalSummary": "",
        "skills": [],
        "experience": [],
        "education": [],
        "projects": [],
        "languages": [],
        "certifications": [],
    }
    assert _schema_completeness(outputs, {})["score"] == 1.0


def test_schema_completeness_partial():
    result = _schema_completeness({"personalInfo": {}}, {})
    assert 0.0 < result["score"] < 1.0


def test_ats_keyword_coverage_full_match():
    outputs = {"skills": ["Python", "FastAPI"], "professionalSummary": "Docker expert"}
    result = _ats_keyword_coverage(outputs, {"expectedKeywords": ["Python", "FastAPI", "Docker"]})
    assert result["score"] == 1.0


def test_ats_keyword_coverage_partial_match():
    outputs = {"skills": ["Python"]}
    result = _ats_keyword_coverage(outputs, {"expectedKeywords": ["Python", "Kubernetes"]})
    assert result["score"] == 0.5


def test_ats_keyword_coverage_missing_reference():
    result = _ats_keyword_coverage({"skills": ["Python"]}, {})
    assert result["score"] is None


def test_no_invented_companies_clean():
    outputs = {"experience": [{"company": "Acme Corp"}]}
    result = _no_invented_companies(outputs, {"allowedCompanies": ["Acme Corp"]})
    assert result["score"] == 1.0


def test_no_invented_companies_detects_invention():
    outputs = {"experience": [{"company": "Fake Inc"}]}
    result = _no_invented_companies(outputs, {"allowedCompanies": ["Acme Corp"]})
    assert result["score"] == 0.0


def test_no_placeholder_leftovers_clean():
    outputs = {"personalInfo": {"name": "Jane Doe"}}
    assert _no_placeholder_leftovers(outputs, {})["score"] == 1.0


def test_no_placeholder_leftovers_detects_template_artifact():
    outputs = {"personalInfo": {"name": "..."}}
    assert _no_placeholder_leftovers(outputs, {})["score"] == 0.0


def test_content_completeness_all_carried_over():
    inputs = {"profile": {"experience": [{"title": "Dev"}], "skills": ["Python"]}}
    outputs = {"experience": [{"title": "Dev"}], "skills": ["Python"]}
    assert _content_completeness(inputs, outputs)["score"] == 1.0


def test_content_completeness_dropped_section():
    inputs = {"profile": {"experience": [{"title": "Dev"}], "skills": ["Python"]}}
    outputs = {"experience": [{"title": "Dev"}], "skills": []}
    result = _content_completeness(inputs, outputs)
    assert result["score"] == 0.5
    assert "skills" in result["comment"]


def test_content_completeness_empty_profile_sections():
    result = _content_completeness({"profile": {}}, {"experience": []})
    assert result["score"] is None


def test_content_completeness_not_valid_json():
    inputs = {"profile": {"skills": ["Python"]}}
    assert _content_completeness(inputs, {"rawMarkdown": "oops"})["score"] == 0.0


@pytest.mark.parametrize(
    "evaluator",
    [_valid_json, _schema_completeness, _ats_keyword_coverage, _no_invented_companies, _no_placeholder_leftovers],
)
def test_evaluator_parameter_names_match_langsmith_convention(evaluator):
    """`langsmith.evaluate()` binds evaluator arguments by NAME against a
    fixed set it recognizes (`run`, `example`, `inputs`, `outputs`,
    `reference_outputs`) — see the identical regression test in
    `test_langsmith_eval.py` for the bug this guards against."""
    params = list(inspect.signature(evaluator).parameters)
    assert params == ["outputs", "reference_outputs"]
