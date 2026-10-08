"""Loads the ESCO skills/occupations reference vocabulary, if available.

ESCO CSV files are not shipped with the repo (see data/esco/README.md) — when
absent, `EscoTaxonomy.available` is False and callers fall back to the legacy
custom `skills_taxonomy` table / `SKILL_ALIASES`.
"""
from __future__ import annotations

import csv
import hashlib
import logging
import os
from dataclasses import dataclass, field
from functools import lru_cache

from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")


@dataclass(slots=True)
class EscoConcept:
    uri: str
    preferred_label: str
    alt_labels: list[str] = field(default_factory=list)
    concept_type: str = "skill"  # "skill" | "occupation"


class EscoTaxonomy:
    """In-memory lookup table built from the ESCO CSV export, if present."""

    def __init__(self, data_dir: str) -> None:
        self.data_dir = data_dir
        self.concepts: list[EscoConcept] = []
        # label (lowercased) -> concept, for O(1) exact match
        self._label_index: dict[str, EscoConcept] = {}
        self._all_labels_cache: list[str] | None = None
        # Word -> set of labels containing that word, built once at load
        # time. Lets fuzzy lookups scan a small relevant slice of the
        # vocabulary instead of all 100k+ labels for every term (see
        # `labels_near`).
        self._word_index: dict[str, set[str]] = {}
        self.available = False
        self.version = "none"
        self._load()

    def _load(self) -> None:
        skills_path = os.path.join(self.data_dir, "skills.csv")
        occupations_path = os.path.join(self.data_dir, "occupations.csv")
        loaded_any = False
        for path, concept_type in ((skills_path, "skill"), (occupations_path, "occupation")):
            if not os.path.isfile(path):
                continue
            try:
                loaded_any |= self._load_csv(path, concept_type)
            except Exception as e:  # malformed CSV should never crash the service
                logger.warning(f"Failed to load ESCO file {path}: {e}")
        self.available = loaded_any
        if not self.available:
            logger.info(
                f"ESCO taxonomy data not found under {self.data_dir}; "
                "matching will fall back to the custom skills_taxonomy table."
            )
        else:
            logger.info(f"Loaded {len(self.concepts)} ESCO concepts from {self.data_dir}.")

        # Version fingerprint used as part of the matching-result cache key so
        # that re-importing/updating the ESCO CSVs invalidates previously
        # cached scores instead of silently serving stale results for up to
        # `matching_cache_ttl_seconds`.
        self.version = self._compute_version(skills_path, occupations_path)

    def _compute_version(self, *paths: str) -> str:
        parts = []
        for path in paths:
            try:
                stat = os.stat(path)
                parts.append(f"{path}:{stat.st_mtime_ns}:{stat.st_size}")
            except OSError:
                continue
        return hashlib.md5("|".join(parts).encode()).hexdigest()[:12] if parts else "none"

    def _load_csv(self, path: str, concept_type: str) -> bool:
        with open(path, encoding="utf-8-sig", newline="") as f:
            reader = csv.DictReader(f)
            count = 0
            for row in reader:
                uri = row.get("conceptUri") or row.get("uri") or ""
                preferred = (row.get("preferredLabel") or "").strip()
                if not preferred:
                    continue
                alt_raw = row.get("altLabels") or ""
                alt_labels = [a.strip() for a in alt_raw.split("\n") if a.strip()] if alt_raw else []
                concept = EscoConcept(
                    uri=uri,
                    preferred_label=preferred,
                    alt_labels=alt_labels,
                    concept_type=concept_type,
                )
                self.concepts.append(concept)
                self._index_label(preferred.lower(), concept)
                for alt in alt_labels:
                    key = alt.lower()
                    existing = self._label_index.get(key)
                    if existing is not None and existing is not concept:
                        logger.debug(
                            f"ESCO alt-label collision for '{alt}': keeping '{existing.preferred_label}' "
                            f"over '{concept.preferred_label}'."
                        )
                        continue
                    self._index_label(key, concept)
                count += 1
        return count > 0

    def _index_label(self, label: str, concept: EscoConcept) -> None:
        self._label_index[label] = concept
        for word in label.split():
            self._word_index.setdefault(word, set()).add(label)

    def labels_near(self, term: str) -> list[str]:
        """Labels sharing at least one word with `term` — a cheap blocking
        pass that shrinks the fuzzy-match candidate pool from 100k+ labels
        down to a few hundred/thousand relevant ones. Falls back to the full
        vocabulary when the term shares no word with any label (rare —
        typically means the term itself needs the full scan anyway)."""
        words = term.split()
        candidates: set[str] = set()
        for word in words:
            candidates |= self._word_index.get(word, set())
        return list(candidates) if candidates else self.all_labels()

    def exact_match(self, term: str) -> EscoConcept | None:
        return self._label_index.get(term.strip().lower())

    def all_labels(self) -> list[str]:
        # `_label_index` can hold 100k+ entries (ESCO's full skill+occupation
        # vocabulary); rebuilding this list on every call — as this used to
        # do — meant re-materializing it on every single skill/degree/
        # certification term being fuzzy-matched (dozens of times per
        # candidate/job pair), which dominated scoring latency. Cached once,
        # invalidated only when `_load()` repopulates the index.
        if self._all_labels_cache is None:
            self._all_labels_cache = list(self._label_index.keys())
        return self._all_labels_cache

    def concept_for_label(self, label: str) -> EscoConcept | None:
        return self._label_index.get(label.strip().lower())


@lru_cache(maxsize=1)
def get_esco_taxonomy(data_dir: str) -> EscoTaxonomy:
    return EscoTaxonomy(data_dir)


def load_esco_taxonomy(settings: Settings) -> EscoTaxonomy:
    return get_esco_taxonomy(settings.esco_data_dir)
