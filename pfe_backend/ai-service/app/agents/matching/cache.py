"""Redis cache for computed CV/offer matching scores, keyed by
(candidate_id, job_offer_id, model_version, esco data version, content hash)
so a stored result is invalidated automatically if the scoring logic/model
changes OR if the candidate/job content itself changes (even under the same
DB id — e.g. a candidate edits their CV, a recruiter edits the job posting).
Best-effort: any Redis failure is logged and treated as a cache miss rather
than failing the request.
"""
from __future__ import annotations

import hashlib
import json
import logging

import redis

from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")

MODEL_VERSION = "unified-engine-v1"  # bump when scoring logic changes materially


def content_fingerprint(*payloads: str) -> str:
    """Hashes the raw candidate/job payloads so an edit to either (same DB id)
    invalidates the cache instead of silently returning a stale result."""
    return hashlib.md5("|".join(payloads).encode()).hexdigest()[:16]


def _cache_key(candidate_id: str, job_offer_id: str, esco_version: str, content_hash: str) -> str:
    raw = f"{candidate_id}:{job_offer_id}:{MODEL_VERSION}:{esco_version}:{content_hash}"
    return "matching:score:" + hashlib.md5(raw.encode()).hexdigest()


class MatchingResultCache:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.ttl_seconds = settings.matching_cache_ttl_seconds
        try:
            self.client: redis.Redis | None = redis.Redis.from_url(settings.redis_url, socket_timeout=1.0)
            self.client.ping()
        except Exception as e:
            logger.warning(f"Redis unavailable, matching result cache disabled: {e}")
            self.client = None

    def get(self, candidate_id: str, job_offer_id: str, esco_version: str, content_hash: str) -> dict | None:
        if not self.client or not candidate_id or not job_offer_id:
            return None
        try:
            raw = self.client.get(_cache_key(candidate_id, job_offer_id, esco_version, content_hash))
            return json.loads(raw) if raw else None
        except Exception as e:
            logger.warning(f"Matching cache read failed: {e}")
            return None

    def set(self, candidate_id: str, job_offer_id: str, result: dict, esco_version: str, content_hash: str) -> None:
        if not self.client or not candidate_id or not job_offer_id:
            return
        try:
            key = _cache_key(candidate_id, job_offer_id, esco_version, content_hash)
            self.client.setex(key, self.ttl_seconds, json.dumps(result))
        except Exception as e:
            logger.warning(f"Matching cache write failed: {e}")
