"""Term normalization: ESCO exact match -> rapidfuzz fallback -> legacy custom taxonomy."""
from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from typing import Literal

from rapidfuzz import fuzz, process

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import EscoTaxonomy

MatchedVia = Literal["esco_exact", "esco_fuzzy", "custom", "unmatched"]


@dataclass(slots=True)
class NormalizedTerm:
    raw: str
    esco_id: str | None
    canonical_label: str
    matched_via: MatchedVia


def normalize_to_esco(
    term: str,
    esco: EscoTaxonomy,
    normalizer: NormalizationAgent,
    db_mappings: dict[str, str] | None = None,
    fuzzy_threshold: int = 85,
) -> NormalizedTerm:
    """Resolve a raw skill/degree/certification string to an ESCO concept.

    Falls back to the legacy custom taxonomy (SKILL_ALIASES / DB-loaded
    skills_taxonomy) when ESCO data isn't available or no match is found,
    so behaviour degrades gracefully rather than failing outright.

    The ESCO fuzzy fallback (`process.extractOne` against the full 100k+
    label vocabulary) dominates scoring latency when the same terms are
    normalized repeatedly — e.g. one candidate's skills re-normalized
    against every retrieved job in the recommendation pipeline. Only the
    ESCO lookup (exact + fuzzy) is memoized, keyed on `esco` (a true
    process-wide singleton via `load_esco_taxonomy`'s `lru_cache`) — not on
    `normalizer`, which is cheap to construct but NOT a singleton (a fresh
    `NormalizationAgent` per pipeline instance would otherwise silently
    defeat this cache across requests). The legacy custom-taxonomy fallback
    only runs on the rare miss, so it's always computed fresh.
    """
    cleaned = term.strip()
    if not cleaned:
        return NormalizedTerm(raw=term, esco_id=None, canonical_label="", matched_via="unmatched")

    esco_hit = _esco_lookup_cached(cleaned, esco, fuzzy_threshold)
    if esco_hit:
        esco_id, canonical_label, matched_via = esco_hit
        return NormalizedTerm(raw=term, esco_id=esco_id, canonical_label=canonical_label, matched_via=matched_via)

    canonical = normalizer.canonical_skill(cleaned, db_mappings)
    if canonical:
        return NormalizedTerm(raw=term, esco_id=None, canonical_label=canonical, matched_via="custom")

    return NormalizedTerm(raw=term, esco_id=None, canonical_label=cleaned.lower(), matched_via="unmatched")


@lru_cache(maxsize=8192)
def _esco_lookup_cached(
    cleaned: str,
    esco: EscoTaxonomy,
    fuzzy_threshold: int,
) -> tuple[str | None, str, MatchedVia] | None:
    if not esco.available:
        return None

    exact = esco.exact_match(cleaned)
    if exact:
        return (exact.uri, exact.preferred_label, "esco_exact")

    labels = esco.labels_near(cleaned.lower())
    if labels:
        best = process.extractOne(cleaned.lower(), labels, scorer=fuzz.token_sort_ratio, score_cutoff=fuzzy_threshold)
        if best:
            matched_label, _score, _idx = best
            concept = esco.concept_for_label(matched_label)
            if concept:
                return (concept.uri, concept.preferred_label, "esco_fuzzy")

    return None


def fuzzy_overlap(
    candidate_terms: list[str],
    required_terms: list[str],
    esco: EscoTaxonomy,
    normalizer: NormalizationAgent,
    db_mappings: dict[str, str] | None = None,
    fuzzy_threshold: int = 85,
) -> tuple[list[str], list[str]]:
    """Returns (matched_required, missing_required) after ESCO/rapidfuzz normalization."""
    norm_candidates = [normalize_to_esco(t, esco, normalizer, db_mappings, fuzzy_threshold) for t in candidate_terms]
    norm_required = [normalize_to_esco(t, esco, normalizer, db_mappings, fuzzy_threshold) for t in required_terms]

    candidate_keys = {(t.esco_id or t.canonical_label) for t in norm_candidates}
    matched: list[str] = []
    missing: list[str] = []

    # Residual fuzzy pass pool: each candidate contributes its canonical label
    # and raw term, tagged with the candidate's index. Built once (not per
    # required-term iteration) since it never changes within this call.
    pool_labels = [c.canonical_label for c in norm_candidates] + [c.raw for c in norm_candidates]
    pool_owner = list(range(len(norm_candidates))) * 2
    consumed = [False] * len(norm_candidates)

    for req in norm_required:
        key = req.esco_id or req.canonical_label
        if key in candidate_keys:
            matched.append(req.canonical_label)
            continue

        # Residual fuzzy pass, for terms unmatched in ESCO on both sides
        # (typos, phrasing variants). Each candidate skill can satisfy at most
        # one required skill here — without this, a single vague candidate
        # term could fuzzy-match several required skills at once, inflating
        # the matched count for skills the candidate doesn't actually have.
        available = [(label, owner) for label, owner in zip(pool_labels, pool_owner) if not consumed[owner]]
        if not available:
            missing.append(req.canonical_label)
            continue

        available_labels = [label for label, _owner in available]
        best = process.extractOne(req.canonical_label, available_labels, scorer=fuzz.token_sort_ratio, score_cutoff=fuzzy_threshold)
        if best:
            _matched_label, _score, idx = best
            consumed[available[idx][1]] = True
            matched.append(req.canonical_label)
        else:
            missing.append(req.canonical_label)

    return matched, missing
