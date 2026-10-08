"""Generalized over-qualification penalty, applied to both `experience` and
`education` criteria (see §2.9 decision — previously experience-only).

When a candidate vastly exceeds what's required (ratio > threshold), the
score is capped rather than left at its natural (already-clamped-to-1.0)
value, to avoid implicitly favoring extreme over-qualification, which
correlates with flight risk / salary mismatch.
"""
from __future__ import annotations


def overqualification_penalty(
    candidate_value: float,
    required_value: float,
    base_score: float,
    ratio_threshold: float = 3.0,
    capped_score: float = 0.7,
) -> float:
    """Returns `base_score`, capped at `capped_score` when
    `candidate_value / required_value > ratio_threshold`.

    No-ops (returns `base_score` unchanged) when `required_value <= 0`, since
    the ratio is meaningless without a positive requirement.
    """
    if required_value <= 0:
        return base_score

    ratio = candidate_value / required_value
    if ratio > ratio_threshold:
        return min(base_score, capped_score)
    return base_score
