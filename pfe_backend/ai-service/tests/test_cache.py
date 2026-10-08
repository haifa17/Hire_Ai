from __future__ import annotations

from app.agents.matching.cache import _cache_key, content_fingerprint


def test_cache_key_changes_with_esco_version():
    """Regression test: the cache key must vary with the ESCO taxonomy
    version, otherwise re-importing ESCO data never invalidates stale
    cached scores (previously esco_version was accepted but never passed
    by any caller, so it always defaulted to "none")."""
    key_v1 = _cache_key("cand-1", "job-1", "esco-v1", "content-hash")
    key_v2 = _cache_key("cand-1", "job-1", "esco-v2", "content-hash")
    assert key_v1 != key_v2


def test_cache_key_changes_with_content_hash():
    """Regression test: editing a candidate's CV or a job posting (same DB id)
    must produce a different cache key so the stale score isn't served."""
    key_before = _cache_key("cand-1", "job-1", "esco-v1", content_fingerprint("cv text v1"))
    key_after = _cache_key("cand-1", "job-1", "esco-v1", content_fingerprint("cv text v2"))
    assert key_before != key_after


def test_content_fingerprint_is_deterministic():
    assert content_fingerprint("a", "b") == content_fingerprint("a", "b")
    assert content_fingerprint("a", "b") != content_fingerprint("a", "c")
