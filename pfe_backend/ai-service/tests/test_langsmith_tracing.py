from __future__ import annotations

import os

import pytest

from app.config.settings import Settings
from app.observability import langsmith_tracing as tracing


def _settings(**overrides) -> Settings:
    base = dict(
        app_name="Test App",
        app_host="127.0.0.1",
        app_port=8001,
        ai_provider="groq",
        groq_api_key="k",
        groq_model="m",
        groq_url="http://x",
        groq_timeout_seconds=1,
        nvidia_nim_api_key="k",
        nvidia_nim_model="m",
        nvidia_nim_url="http://x",
        nvidia_nim_timeout_seconds=1,
        openrouter_api_key="k",
        openrouter_model="m",
        openrouter_url="http://x",
        openrouter_timeout_seconds=1,
        ollama_url="http://x",
        ollama_model="m",
        ollama_timeout_seconds=1,
        embedding_dimensions=64,
        database_url="postgresql://localhost/db",
        qdrant_url="http://localhost:6333",
        redis_url="redis://localhost:6379/0",
        esco_data_dir="data/esco",
        unified_skills_weight=0.30,
        unified_experience_weight=0.20,
        unified_semantic_weight=0.20,
        unified_education_weight=0.12,
        unified_projects_weight=0.10,
        unified_languages_weight=0.05,
        unified_certifications_weight=0.03,
        matching_semantic_summary_weight=0.2,
        matching_semantic_skills_weight=0.5,
        matching_semantic_experience_weight=0.3,
        matching_fuzzy_threshold=85,
        matching_cache_ttl_seconds=86400,
        lgbm_model_path="",
        langsmith_api_key="",
        langsmith_tracing=False,
        langsmith_project="talentbridge-matching",
        rec_retrieval_top_k=100,
        rec_final_top_k=10,
        rec_cache_ttl_hours=24,
        rec_candidates_collection="c",
        rec_jobs_collection="j",
    )
    base.update(overrides)
    return Settings(**base)


@pytest.fixture(autouse=True)
def _reset_tracing_state():
    """Isolate each test from tracing env vars/global state set by others."""
    for var in ("LANGSMITH_TRACING", "LANGSMITH_API_KEY", "LANGSMITH_PROJECT",
                "LANGCHAIN_TRACING_V2", "LANGCHAIN_API_KEY", "LANGCHAIN_PROJECT"):
        os.environ.pop(var, None)
    tracing._enabled = False
    tracing._configured = False
    yield
    for var in ("LANGSMITH_TRACING", "LANGSMITH_API_KEY", "LANGSMITH_PROJECT",
                "LANGCHAIN_TRACING_V2", "LANGCHAIN_API_KEY", "LANGCHAIN_PROJECT"):
        os.environ.pop(var, None)
    tracing._enabled = False
    tracing._configured = False


def test_disabled_without_api_key():
    tracing.configure_langsmith(_settings(langsmith_api_key="", langsmith_tracing=True))
    assert tracing.is_enabled() is False
    assert os.environ.get("LANGSMITH_TRACING") != "true"


def test_disabled_when_tracing_flag_false():
    tracing.configure_langsmith(_settings(langsmith_api_key="secret", langsmith_tracing=False))
    assert tracing.is_enabled() is False


def test_enabled_when_key_and_flag_set():
    tracing.configure_langsmith(
        _settings(langsmith_api_key="secret", langsmith_tracing=True, langsmith_project="my-proj")
    )
    assert tracing.is_enabled() is True
    assert os.environ["LANGSMITH_API_KEY"] == "secret"
    assert os.environ["LANGSMITH_PROJECT"] == "my-proj"
    assert os.environ["LANGSMITH_TRACING"] == "true"


def test_configure_never_raises_on_bad_settings():
    # configure_langsmith must not blow up the app even if something
    # unexpected happens while wiring tracing up.
    class Broken:
        langsmith_api_key = "secret"
        langsmith_tracing = True

        @property
        def langsmith_project(self):
            raise RuntimeError("boom")

    tracing.configure_langsmith(Broken())  # type: ignore[arg-type]
    assert tracing.is_enabled() is False


def test_traceable_is_transparent_passthrough_when_disabled():
    calls = []

    @tracing.traceable(run_type="llm", name="dummy")
    def fn(x):
        calls.append(x)
        return x * 2

    assert fn(3) == 6
    assert calls == [3]


@pytest.mark.asyncio
async def test_traceable_transparent_passthrough_async_when_disabled():
    @tracing.traceable(run_type="chain", name="dummy_async")
    async def fn(x):
        return x + 1

    assert await fn(1) == 2


def test_traceable_function_still_works_when_enabled_but_backend_unreachable():
    tracing.configure_langsmith(
        _settings(langsmith_api_key="fake-key-not-real", langsmith_tracing=True)
    )

    @tracing.traceable(run_type="llm", name="dummy_llm_call")
    def fn(prompt: str) -> str:
        return f"echo:{prompt}"

    # Even though LangSmith has no real network access to submit the trace in
    # this test environment, the wrapped function must still run and return
    # its normal result — tracing must never block the main flow.
    assert fn("hello") == "echo:hello"
