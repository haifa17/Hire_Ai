#!/usr/bin/env python
"""Weight-calibration CLI for the unified scoring engine (plan §10).

Runs `unified_engine.compute_unified_score` over a labeled dataset of
(candidate, job_offer, human_label) triples across a grid of
`UNIFIED_SEMANTIC_WEIGHT` values (the other 6 weights are renormalized to
fill the remaining budget, keeping their *relative* proportions from
`settings.py`), scores each grid point against the human labels (ROC-AUC for
a binary label, Spearman correlation for a graded label), and prints/saves
the best-performing `.env` snippet.

This is a dev-only offline tool — it is never imported by the running
service.

Usage
-----
    python scripts/calibrate_weights.py --dataset path/to/labeled.json
    python scripts/calibrate_weights.py --dataset path/to/labeled.csv --out best_weights.env

Dataset format (JSON): a list of objects
    {
        "candidate": { ... CandidateProfileSchema fields ... },
        "job_offer": { ... JobOfferSchema fields ... },
        "label": 1  // 0/1 for binary, or any float for graded
    }

Dataset format (CSV): columns `candidate_json`, `job_offer_json`, `label`,
each candidate_json/job_offer_json being a JSON-encoded object as above.
"""
from __future__ import annotations

import argparse
import csv
import json
import sys
from pathlib import Path

# Allow running as `python scripts/calibrate_weights.py` from the ai-service root.
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.agents.matching.normalization import NormalizationAgent  # noqa: E402
from app.agents.matching.rule_based.esco_taxonomy import load_esco_taxonomy  # noqa: E402
from app.agents.scoring.unified_engine import compute_unified_score  # noqa: E402
from app.config.settings import Settings, get_settings  # noqa: E402
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema  # noqa: E402

BASE_WEIGHT_NAMES = [
    "unified_skills_weight",
    "unified_experience_weight",
    "unified_education_weight",
    "unified_projects_weight",
    "unified_languages_weight",
    "unified_certifications_weight",
]
ENV_NAMES = {
    "unified_skills_weight": "UNIFIED_SKILLS_WEIGHT",
    "unified_experience_weight": "UNIFIED_EXPERIENCE_WEIGHT",
    "unified_semantic_weight": "UNIFIED_SEMANTIC_WEIGHT",
    "unified_education_weight": "UNIFIED_EDUCATION_WEIGHT",
    "unified_projects_weight": "UNIFIED_PROJECTS_WEIGHT",
    "unified_languages_weight": "UNIFIED_LANGUAGES_WEIGHT",
    "unified_certifications_weight": "UNIFIED_CERTIFICATIONS_WEIGHT",
}


def load_dataset(path: Path) -> list[dict]:
    if path.suffix.lower() == ".json":
        return json.loads(path.read_text(encoding="utf-8"))
    if path.suffix.lower() == ".csv":
        rows = []
        with path.open(encoding="utf-8", newline="") as f:
            for row in csv.DictReader(f):
                rows.append(
                    {
                        "candidate": json.loads(row["candidate_json"]),
                        "job_offer": json.loads(row["job_offer_json"]),
                        "label": float(row["label"]),
                    }
                )
        return rows
    raise ValueError(f"Unsupported dataset format: {path.suffix}")


def settings_with_semantic_weight(base: Settings, semantic_weight: float) -> Settings:
    """Returns a copy of `base` with `unified_semantic_weight` set to
    `semantic_weight` and the other 6 weights renormalized (keeping their
    relative proportions) to fill the remaining `1 - semantic_weight` budget."""
    remaining_budget = max(0.0, 1.0 - semantic_weight)
    current_others_sum = sum(getattr(base, name) for name in BASE_WEIGHT_NAMES) or 1.0

    overrides = {"unified_semantic_weight": semantic_weight}
    for name in BASE_WEIGHT_NAMES:
        proportion = getattr(base, name) / current_others_sum
        overrides[name] = proportion * remaining_budget

    return Settings(**{**base.__dict__, **overrides})


def score_pairs(dataset: list[dict], settings: Settings) -> list[tuple[float | None, float]]:
    normalizer = NormalizationAgent(settings)
    esco = load_esco_taxonomy(settings)
    results: list[tuple[float | None, float]] = []
    for row in dataset:
        candidate = CandidateProfileSchema.model_validate(row["candidate"])
        job_offer = JobOfferSchema.model_validate(row["job_offer"])
        unified = compute_unified_score(candidate, job_offer, settings, normalizer, esco)
        results.append((unified.overall, float(row["label"])))
    return results


def _rank(values: list[float]) -> list[float]:
    """Average-rank transform (ties get the mean rank), for Spearman."""
    order = sorted(range(len(values)), key=lambda i: values[i])
    ranks = [0.0] * len(values)
    i = 0
    while i < len(order):
        j = i
        while j + 1 < len(order) and values[order[j + 1]] == values[order[i]]:
            j += 1
        avg_rank = (i + j) / 2 + 1
        for k in range(i, j + 1):
            ranks[order[k]] = avg_rank
        i = j + 1
    return ranks


def spearman_correlation(pairs: list[tuple[float, float]]) -> float:
    xs = [p[0] for p in pairs]
    ys = [p[1] for p in pairs]
    rx, ry = _rank(xs), _rank(ys)
    n = len(pairs)
    mean_rx, mean_ry = sum(rx) / n, sum(ry) / n
    cov = sum((a - mean_rx) * (b - mean_ry) for a, b in zip(rx, ry))
    var_x = sum((a - mean_rx) ** 2 for a in rx)
    var_y = sum((b - mean_ry) ** 2 for b in ry)
    if var_x == 0 or var_y == 0:
        return 0.0
    return cov / (var_x**0.5 * var_y**0.5)


def roc_auc(pairs: list[tuple[float, float]]) -> float:
    """Mann-Whitney U based ROC-AUC for a binary (0/1) label."""
    positives = [x for x, y in pairs if y == 1]
    negatives = [x for x, y in pairs if y == 0]
    if not positives or not negatives:
        return 0.5
    ranks = _rank([x for x, _ in pairs])
    rank_sum_pos = sum(r for (x, y), r in zip(pairs, ranks) if y == 1)
    n_pos, n_neg = len(positives), len(negatives)
    u = rank_sum_pos - n_pos * (n_pos + 1) / 2
    return u / (n_pos * n_neg)


def evaluate(pairs: list[tuple[float | None, float]]) -> tuple[float, int]:
    """Drops pairs with `overall is None` (no signal available) and returns
    (metric, evaluated_count). Metric is ROC-AUC if the label set is exactly
    {0, 1}, else Spearman correlation."""
    usable = [(x, y) for x, y in pairs if x is not None]
    if len(usable) < 2:
        return 0.0, len(usable)
    labels = {y for _, y in usable}
    metric = roc_auc(usable) if labels <= {0.0, 1.0} else spearman_correlation(usable)
    return metric, len(usable)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--dataset", required=True, type=Path, help="Path to a labeled .json or .csv dataset")
    parser.add_argument(
        "--grid",
        default="0.05,0.10,0.15,0.20,0.25,0.30,0.35,0.40",
        help="Comma-separated UNIFIED_SEMANTIC_WEIGHT values to try",
    )
    parser.add_argument("--out", type=Path, default=None, help="Optional path to save the best config as a .env snippet")
    args = parser.parse_args()

    dataset = load_dataset(args.dataset)
    if not dataset:
        print("Dataset is empty.", file=sys.stderr)
        sys.exit(1)

    base_settings = get_settings()
    grid = [float(v) for v in args.grid.split(",")]

    best_metric = float("-inf")
    best_weight = base_settings.unified_semantic_weight
    best_evaluated = 0

    for semantic_weight in grid:
        trial_settings = settings_with_semantic_weight(base_settings, semantic_weight)
        pairs = score_pairs(dataset, trial_settings)
        metric, evaluated = evaluate(pairs)
        print(f"UNIFIED_SEMANTIC_WEIGHT={semantic_weight:.2f}  metric={metric:.4f}  evaluated={evaluated}/{len(dataset)}")
        if metric > best_metric:
            best_metric = metric
            best_weight = semantic_weight
            best_evaluated = evaluated

    best_settings = settings_with_semantic_weight(base_settings, best_weight)
    snippet_lines = [f"{ENV_NAMES[name]}={getattr(best_settings, name):.4f}" for name in ENV_NAMES]
    snippet = "\n".join(snippet_lines)

    print(f"\nBest UNIFIED_SEMANTIC_WEIGHT={best_weight:.2f} (metric={best_metric:.4f}, evaluated={best_evaluated}/{len(dataset)})")
    print("\n# .env snippet\n" + snippet)

    if args.out:
        args.out.write_text(snippet + "\n", encoding="utf-8")
        print(f"\nSaved to {args.out}")


if __name__ == "__main__":
    main()
