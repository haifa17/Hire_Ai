"""Offline training script for the Phase-2 LGBMRanker (scaffold).

Not run in production yet — there is no labeled interaction dataset
(application / interview / hire outcomes) at the time this was written.
Once one exists, export it as a CSV with columns:

    group_id, label, rule_skills, rule_experience, rule_projects,
    rule_education, rule_languages, rule_certifications,
    semantic_summary, semantic_skills, semantic_experience

- `group_id` groups the candidates scored against the same job offer
  (LGBMRanker needs group sizes for lambdarank).
- `label` is the outcome: e.g. 0 = no interaction, 1 = applied,
  2 = interviewed, 3 = hired (higher = more relevant).

Usage:
    python -m app.agents.matching.ranking.train --data path/to/interactions.csv --out models/matching_lgbm.txt
"""
from __future__ import annotations

import argparse

import pandas as pd

from app.agents.matching.ranking.features import FEATURE_NAMES


def train(data_path: str, output_path: str) -> None:
    import lightgbm as lgb

    df = pd.read_csv(data_path)
    missing = [c for c in FEATURE_NAMES + ["group_id", "label"] if c not in df.columns]
    if missing:
        raise ValueError(f"Training data is missing required columns: {missing}")

    df = df.sort_values("group_id")
    group_sizes = df.groupby("group_id", sort=False).size().tolist()

    train_set = lgb.Dataset(df[FEATURE_NAMES], label=df["label"], group=group_sizes)
    params = {
        "objective": "lambdarank",
        "metric": "ndcg",
        "learning_rate": 0.05,
        "num_leaves": 31,
    }
    booster = lgb.train(params, train_set, num_boost_round=200)
    booster.save_model(output_path)
    print(f"Saved LightGBM ranker to {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--data", required=True, help="CSV of labeled candidate/job interactions")
    parser.add_argument("--out", required=True, help="Path to write the trained model (e.g. models/matching_lgbm.txt)")
    args = parser.parse_args()
    train(args.data, args.out)
