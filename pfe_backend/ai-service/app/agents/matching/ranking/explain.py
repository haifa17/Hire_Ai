"""Quantitative explainability: SHAP feature attribution when a LightGBM
model is loaded, falling back to a weighted-contribution ranking of the
rule-based/semantic criterion scores otherwise. Output shape is identical
either way so API consumers don't need to branch on which path ran.
"""
from __future__ import annotations

import logging

from app.agents.matching.ranking.features import FEATURE_NAMES
from app.agents.matching.ranking.lgbm_ranker import LgbmRankerWrapper
from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")

# Fallback weights mirroring the unified engine's own weighted average,
# used only to rank contributions when no LightGBM model is available.
def _fallback_weights(settings: Settings) -> dict[str, float]:
    return {
        "skills": settings.unified_skills_weight,
        "experience": settings.unified_experience_weight,
        "semantic": settings.unified_semantic_weight,
        "education": settings.unified_education_weight,
        "projects": settings.unified_projects_weight,
        "languages": settings.unified_languages_weight,
        "certifications": settings.unified_certifications_weight,
    }


def explain_score(features: dict[str, float], ranker: LgbmRankerWrapper, settings: Settings) -> list[dict]:
    if ranker.available:
        try:
            return _shap_explain(features, ranker)
        except Exception as e:
            logger.warning(f"SHAP explanation failed: {e}. Falling back to weighted contribution ranking.")

    return _weighted_fallback_explain(features, settings)


def _shap_explain(features: dict[str, float], ranker: LgbmRankerWrapper) -> list[dict]:
    import shap

    explainer = shap.TreeExplainer(ranker.model)
    vector = [[features[name] for name in FEATURE_NAMES]]
    shap_values = explainer.shap_values(vector)
    row = shap_values[0] if hasattr(shap_values, "__len__") else shap_values
    contributions = [
        {"feature": name, "value": features[name], "contribution": float(row[i])}
        for i, name in enumerate(FEATURE_NAMES)
    ]
    contributions.sort(key=lambda c: abs(c["contribution"]), reverse=True)
    return contributions


def _weighted_fallback_explain(features: dict[str, float], settings: Settings) -> list[dict]:
    contributions = [
        {
            "feature": name,
            "value": features.get(name, 0.0),
            "contribution": features.get(name, 0.0) * weight,
        }
        for name, weight in _fallback_weights(settings).items()
    ]
    contributions.sort(key=lambda c: abs(c["contribution"]), reverse=True)
    return contributions
