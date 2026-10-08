from __future__ import annotations

import inspect
import os

import pytest

from app.scripts.langsmith_eval import (
    _breakdown_completeness,
    _explanation_present,
    _matched_missing_skills_disjoint,
    _score_within_range,
    build_matching_dataset,
    run_matching_evaluation,
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
        build_matching_dataset()


def test_run_eval_requires_api_key():
    with pytest.raises(RuntimeError, match="LANGSMITH_API_KEY"):
        run_matching_evaluation()


def test_score_within_range_pass():
    result = _score_within_range({"globalScore": 82}, {"expectedScoreRange": [70, 100]})
    assert result["score"] == 1.0


def test_score_within_range_fail():
    result = _score_within_range({"globalScore": 10}, {"expectedScoreRange": [70, 100]})
    assert result["score"] == 0.0


def test_score_within_range_missing_data():
    result = _score_within_range({}, {})
    assert result["score"] is None


def test_matched_missing_skills_disjoint_clean():
    outputs = {"matchedSkills": ["Python"], "missingSkills": ["Kubernetes"]}
    assert _matched_missing_skills_disjoint(outputs, {})["score"] == 1.0


def test_matched_missing_skills_disjoint_detects_overlap():
    outputs = {"matchedSkills": ["Python", "Docker"], "missingSkills": ["Docker"]}
    result = _matched_missing_skills_disjoint(outputs, {})
    assert result["score"] == 0.0
    assert "Docker" in result["comment"]


def test_explanation_present_true():
    assert _explanation_present({"explanation": "Strong match on skills."}, {})["score"] == 1.0


def test_explanation_present_false():
    assert _explanation_present({"explanation": ""}, {})["score"] == 0.0
    assert _explanation_present({}, {})["score"] == 0.0


def test_breakdown_completeness_full():
    breakdown = {
        "skills": 0.8,
        "experience": 0.7,
        "semantic": 0.6,
        "education": 0.5,
        "projects": 0.4,
        "languages": 0.3,
        "certifications": 0.2,
    }
    assert _breakdown_completeness({"breakdown": breakdown}, {})["score"] == 1.0


def test_breakdown_completeness_partial():
    result = _breakdown_completeness({"breakdown": {"skills": 0.8}, "unavailableCriteria": ["education"]}, {})
    assert 0.0 < result["score"] < 1.0
    assert "education" in result["comment"]


@pytest.mark.parametrize(
    "evaluator", [_score_within_range, _matched_missing_skills_disjoint, _explanation_present, _breakdown_completeness]
)
def test_evaluator_parameter_names_match_langsmith_convention(evaluator):
    """`langsmith.evaluate()` binds evaluator arguments by NAME against a
    fixed set it recognizes (`run`, `example`, `inputs`, `outputs`,
    `reference_outputs`) and falls back to positional binding — silently
    passing the wrong objects — for anything else. This regression-tests the
    real bug that caused (run `outputs`, raw `Example`) to be passed instead
    of (`outputs`, `reference_outputs` dict), crashing every evaluator with
    `AttributeError: 'Example' object has no attribute 'get'` during
    `run-eval`."""
    params = list(inspect.signature(evaluator).parameters)
    assert params == ["outputs", "reference_outputs"]
