from __future__ import annotations

import inspect

import pytest

from app.scripts.langsmith_eval_recommendation import (
    _explanations_present,
    _no_duplicate_recommendations,
    _recall_at_k,
    _scores_valid_and_ranked,
    build_recommendation_dataset,
    run_recommendation_evaluation,
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
        build_recommendation_dataset()


def test_run_eval_requires_api_key():
    with pytest.raises(RuntimeError, match="LANGSMITH_API_KEY"):
        run_recommendation_evaluation()


def test_recall_at_k_full_match():
    outputs = {"recommendations": [{"entity_id": "job-1"}, {"entity_id": "job-2"}]}
    result = _recall_at_k(outputs, {"expectedTopEntityIds": ["job-1"]})
    assert result["score"] == 1.0


def test_recall_at_k_no_match():
    outputs = {"recommendations": [{"entity_id": "job-9"}]}
    result = _recall_at_k(outputs, {"expectedTopEntityIds": ["job-1"]})
    assert result["score"] == 0.0


def test_recall_at_k_missing_reference():
    result = _recall_at_k({"recommendations": []}, {})
    assert result["score"] is None


def test_no_duplicate_recommendations_clean():
    outputs = {"recommendations": [{"entity_id": "a"}, {"entity_id": "b"}]}
    assert _no_duplicate_recommendations(outputs, {})["score"] == 1.0


def test_no_duplicate_recommendations_detects_dupe():
    outputs = {"recommendations": [{"entity_id": "a"}, {"entity_id": "a"}]}
    assert _no_duplicate_recommendations(outputs, {})["score"] == 0.0


def test_scores_valid_and_ranked_pass():
    outputs = {"recommendations": [{"overall_score": 90.0}, {"overall_score": 70.0}]}
    assert _scores_valid_and_ranked(outputs, {})["score"] == 1.0


def test_scores_valid_and_ranked_out_of_range():
    outputs = {"recommendations": [{"overall_score": 150.0}]}
    result = _scores_valid_and_ranked(outputs, {})
    assert result["score"] == 0.0
    assert "out-of-range" in result["comment"]


def test_scores_valid_and_ranked_not_sorted():
    outputs = {"recommendations": [{"overall_score": 50.0}, {"overall_score": 90.0}]}
    result = _scores_valid_and_ranked(outputs, {})
    assert result["score"] == 0.0
    assert "not sorted" in result["comment"]


def test_scores_valid_and_ranked_empty():
    result = _scores_valid_and_ranked({"recommendations": []}, {})
    assert result["score"] is None


def test_explanations_present_all_present():
    outputs = {"recommendations": [{"explanation": "Good match"}, {"explanation": "Also good"}]}
    assert _explanations_present(outputs, {})["score"] == 1.0


def test_explanations_present_some_missing():
    outputs = {"recommendations": [{"explanation": "Good match"}, {"explanation": ""}]}
    assert _explanations_present(outputs, {})["score"] == 0.5


@pytest.mark.parametrize(
    "evaluator",
    [_recall_at_k, _no_duplicate_recommendations, _scores_valid_and_ranked, _explanations_present],
)
def test_evaluator_parameter_names_match_langsmith_convention(evaluator):
    """`langsmith.evaluate()` binds evaluator arguments by NAME — see the
    identical regression test in `test_langsmith_eval.py`."""
    params = list(inspect.signature(evaluator).parameters)
    assert params == ["outputs", "reference_outputs"]
