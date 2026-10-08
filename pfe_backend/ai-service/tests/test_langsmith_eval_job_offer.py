from __future__ import annotations

import inspect

import pytest

from app.scripts.langsmith_eval_job_offer import (
    _generation_succeeded,
    _item_count_within_guidelines,
    _keyword_relevance,
    _salary_not_invented,
    _schema_completeness,
    build_job_offer_dataset,
    run_job_offer_evaluation,
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
        build_job_offer_dataset()


def test_run_eval_requires_api_key():
    with pytest.raises(RuntimeError, match="LANGSMITH_API_KEY"):
        run_job_offer_evaluation()


def test_generation_succeeded_true_when_no_fallback():
    result = _generation_succeeded({"_meta": {"usedFallback": False}}, {})
    assert result["score"] == 1.0


def test_generation_succeeded_false_when_fallback_used():
    result = _generation_succeeded({"_meta": {"usedFallback": True}}, {})
    assert result["score"] == 0.0


def test_schema_completeness_full():
    outputs = {
        "title": "Backend Engineer",
        "summary": "...",
        "responsibilities": ["a"],
        "requirements": ["b"],
        "requiredSkills": ["Python"],
        "benefits": ["Growth"],
        "keywords": ["python"],
    }
    assert _schema_completeness(outputs, {})["score"] == 1.0


def test_schema_completeness_missing_fields():
    result = _schema_completeness({"title": "X"}, {})
    assert 0.0 < result["score"] < 1.0


def test_keyword_relevance_full_match():
    outputs = {"requiredSkills": ["Python", "FastAPI"]}
    result = _keyword_relevance(outputs, {"expectedKeywords": ["Python", "FastAPI"]})
    assert result["score"] == 1.0


def test_keyword_relevance_missing_reference():
    result = _keyword_relevance({"requiredSkills": ["Python"]}, {})
    assert result["score"] is None


def test_salary_not_invented_pass():
    outputs = {"salaryMin": None, "salaryMax": None}
    result = _salary_not_invented(outputs, {"expectSalary": False})
    assert result["score"] == 1.0


def test_salary_not_invented_fail():
    outputs = {"salaryMin": 50000, "salaryMax": 70000}
    result = _salary_not_invented(outputs, {"expectSalary": False})
    assert result["score"] == 0.0


def test_salary_not_invented_not_applicable_when_expected():
    result = _salary_not_invented({"salaryMin": 50000}, {"expectSalary": True})
    assert result["score"] is None


def test_item_count_within_guidelines_pass():
    outputs = {
        "responsibilities": ["a"] * 6,
        "requirements": ["b"] * 6,
        "requiredSkills": ["c"] * 8,
        "benefits": ["d"] * 5,
    }
    assert _item_count_within_guidelines(outputs, {})["score"] == 1.0


def test_item_count_within_guidelines_violations():
    outputs = {
        "responsibilities": ["a"],
        "requirements": ["b"] * 6,
        "requiredSkills": ["c"] * 8,
        "benefits": ["d"] * 5,
    }
    result = _item_count_within_guidelines(outputs, {})
    assert result["score"] == 0.75
    assert "responsibilities" in result["comment"]


@pytest.mark.parametrize(
    "evaluator",
    [_generation_succeeded, _schema_completeness, _keyword_relevance, _salary_not_invented, _item_count_within_guidelines],
)
def test_evaluator_parameter_names_match_langsmith_convention(evaluator):
    """`langsmith.evaluate()` binds evaluator arguments by NAME — see the
    identical regression test in `test_langsmith_eval.py`."""
    params = list(inspect.signature(evaluator).parameters)
    assert params == ["outputs", "reference_outputs"]
