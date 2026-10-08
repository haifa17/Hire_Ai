"""Phase 2 scaffold: LightGBM LGBMRanker wrapper.

Not wired into production scoring until a real model, trained on labeled
interaction data (application/interview/hire outcomes), is available at
`settings.lgbm_model_path`. Until then `predict()` transparently falls back
to the unified engine's own weighted-average `overall` score so callers never
need to branch on whether a model is loaded.
"""
from __future__ import annotations

import logging
import os
from dataclasses import dataclass

from app.agents.matching.ranking.features import FEATURE_NAMES
from app.agents.scoring.unified_engine import UnifiedScore
from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")


@dataclass(slots=True)
class FinalScore:
    score_0_100: int
    method: str  # "unified_weighted_average" | "lgbm"


class LgbmRankerWrapper:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.model = None
        if settings.lgbm_model_path and os.path.isfile(settings.lgbm_model_path):
            try:
                import lightgbm as lgb

                self.model = lgb.Booster(model_file=settings.lgbm_model_path)
                logger.info(f"Loaded LightGBM ranker from {settings.lgbm_model_path}.")
            except Exception as e:
                logger.warning(f"Failed to load LightGBM model at {settings.lgbm_model_path}: {e}. Falling back to unified weighted average.")
                self.model = None

    @property
    def available(self) -> bool:
        return self.model is not None

    def predict(
        self,
        unified: UnifiedScore,
        features: dict[str, float],
    ) -> FinalScore:
        # `unified.overall` is guaranteed non-None by the caller (matching.py
        # only reaches here when it is); a trained model would still treat
        # unavailable criteria as legitimate 0.0 features (see features.py),
        # so only fall back when there's genuinely no model loaded.
        if not self.model:
            return FinalScore(
                score_0_100=max(0, min(100, round((unified.overall or 0.0) * 100))),
                method="unified_weighted_average",
            )

        try:
            vector = [[features[name] for name in FEATURE_NAMES]]
            prediction = float(self.model.predict(vector)[0])
            # lambdarank scores aren't bounded to [0,1] a priori; clip defensively
            normalized = max(0.0, min(1.0, prediction))
            return FinalScore(
                score_0_100=max(0, min(100, round(normalized * 100))),
                method="lgbm",
            )
        except Exception as e:
            logger.warning(f"LightGBM prediction failed: {e}. Falling back to unified weighted average.")
            return FinalScore(
                score_0_100=max(0, min(100, round((unified.overall or 0.0) * 100))),
                method="unified_weighted_average",
            )
