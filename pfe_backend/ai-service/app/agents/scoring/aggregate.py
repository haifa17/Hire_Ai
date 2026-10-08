"""Pure weighted-average aggregation over criteria that may be unavailable
(`None`). Shared by the unified scoring engine (7 top-level criteria) and the
semantic engine's internal 3-section aggregation.
"""
from __future__ import annotations


def compute_weighted_score(
    scores: dict[str, float | None],
    weights: dict[str, float],
) -> tuple[float | None, list[str]]:
    """Weighted average of the available (non-`None`) scores, with weights
    renormalized over only those available criteria.

    Returns `(overall, unavailable_criteria)`:
      - `overall` is `None` when no criterion has a score (nothing to average).
      - `unavailable_criteria` lists the keys (from `scores`, in `scores`
        iteration order) whose value was `None`.
    """
    unavailable = [key for key, value in scores.items() if value is None]

    available_items = [(key, value) for key, value in scores.items() if value is not None]
    if not available_items:
        return None, unavailable

    weight_sum = sum(weights.get(key, 0.0) for key, _ in available_items)
    if weight_sum <= 0:
        # No weight assigned to any available criterion: fall back to a plain
        # (unweighted) average rather than reporting "no score available"
        # when there clearly is data.
        overall = sum(value for _, value in available_items) / len(available_items)
        return overall, unavailable

    overall = sum(value * weights.get(key, 0.0) for key, value in available_items) / weight_sum
    return overall, unavailable
