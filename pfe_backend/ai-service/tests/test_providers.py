from __future__ import annotations

import pytest
from unittest.mock import MagicMock, patch

from app.config.settings import Settings
from app.core.exceptions import AppException
from app.providers.base import AIProvider
from app.providers.groq_provider import GroqProvider
from app.providers.nvidia_nim_provider import NvidiaNimProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.providers.ollama_provider import OllamaProvider
from app.providers.factory import FallbackChainAIProvider, get_provider


class DummyProvider(AIProvider):
    def __init__(self, name: str, should_succeed: bool = True, return_text: str = "ok"):
        self.name = name
        self.should_succeed = should_succeed
        self.return_text = return_text

    def generate(self, prompt: str, json_mode: bool = True) -> str:
        if not self.should_succeed:
            raise RuntimeError(f"Provider {self.name} failed")
        return f"{self.name}: {self.return_text}"


@pytest.fixture
def mock_settings():
    return Settings(
        app_name="Test App",
        app_host="127.0.0.1",
        app_port=8001,
        ai_provider="groq",
        groq_api_key="test_groq_key",
        groq_model="llama-3.3-70b-versatile",
        groq_url="https://api.groq.com/openai/v1/chat/completions",
        groq_timeout_seconds=120,
        nvidia_nim_api_key="test_nvidia_key",
        nvidia_nim_model="nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
        nvidia_nim_url="https://integrate.api.nvidia.com/v1/chat/completions",
        nvidia_nim_timeout_seconds=120,
        openrouter_api_key="test_openrouter_key",
        openrouter_model="gpt-oss-20b",
        openrouter_url="https://openrouter.ai/api/v1/chat/completions",
        openrouter_timeout_seconds=120,
        ollama_url="http://localhost:11434/api/generate",
        ollama_model="llama3.1:8b",
        ollama_timeout_seconds=300,
        embedding_dimensions=64,
        database_url="postgresql://localhost/db",
        qdrant_url="http://localhost:6333",
        redis_url="redis://localhost:6379/0",
        rec_retrieval_top_k=5,
        rec_final_top_k=10,
        rec_cache_ttl_hours=24,
        rec_candidates_collection="recommendation_candidates",
        rec_jobs_collection="recommendation_jobs",
        esco_data_dir="data/esco",
        unified_skills_weight=0.30,
        unified_experience_weight=0.20,
        unified_semantic_weight=0.20,
        unified_education_weight=0.12,
        unified_projects_weight=0.10,
        unified_languages_weight=0.05,
        unified_certifications_weight=0.03,
        matching_semantic_summary_weight=0.20,
        matching_semantic_skills_weight=0.50,
        matching_semantic_experience_weight=0.30,
        matching_fuzzy_threshold=85,
        matching_cache_ttl_seconds=86400,
        lgbm_model_path="",
        langsmith_api_key="",
        langsmith_tracing=False,
        langsmith_project="talentbridge-matching",
    )


def test_nvidia_nim_provider_missing_key(mock_settings):
    bad_settings = Settings(**{**mock_settings.__dict__, "nvidia_nim_api_key": ""})
    provider = NvidiaNimProvider(bad_settings)
    with pytest.raises(AppException) as exc_info:
        provider.generate("test prompt")
    assert exc_info.value.code == "NVIDIA_NIM_API_KEY_MISSING"


@patch("requests.post")
def test_nvidia_nim_provider_success(mock_post, mock_settings):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '{"result": "nvidia_success"}'}}]
    }
    mock_post.return_value = mock_response

    provider = NvidiaNimProvider(mock_settings)
    result = provider.generate("test prompt", json_mode=True)
    assert 'nvidia_success' in result
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["model"] == "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"
    assert "Bearer test_nvidia_key" in kwargs["headers"]["Authorization"]


def test_openrouter_provider_missing_key(mock_settings):
    bad_settings = Settings(**{**mock_settings.__dict__, "openrouter_api_key": ""})
    provider = OpenRouterProvider(bad_settings)
    with pytest.raises(AppException) as exc_info:
        provider.generate("test prompt")
    assert exc_info.value.code == "OPENROUTER_API_KEY_MISSING"


@patch("requests.post")
def test_openrouter_provider_success(mock_post, mock_settings):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {
        "choices": [{"message": {"content": '{"result": "openrouter_success"}'}}]
    }
    mock_post.return_value = mock_response

    provider = OpenRouterProvider(mock_settings)
    result = provider.generate("test prompt", json_mode=True)
    assert 'openrouter_success' in result
    mock_post.assert_called_once()
    args, kwargs = mock_post.call_args
    assert kwargs["json"]["model"] == "gpt-oss-20b"
    assert "Bearer test_openrouter_key" in kwargs["headers"]["Authorization"]


def test_fallback_chain_primary_success():
    groq = DummyProvider("Groq", should_succeed=True, return_text="groq response")
    nvidia = DummyProvider("NVIDIA", should_succeed=True, return_text="nvidia response")
    chain = FallbackChainAIProvider([("Groq", groq), ("NVIDIA", nvidia)])

    res = chain.generate("prompt")
    assert res == "Groq: groq response"


def test_fallback_chain_primary_fails_fallback1_succeeds():
    groq = DummyProvider("Groq", should_succeed=False)
    nvidia = DummyProvider("NVIDIA NIM", should_succeed=True, return_text="nvidia response")
    openrouter = DummyProvider("OpenRouter", should_succeed=True, return_text="openrouter response")
    ollama = DummyProvider("Ollama", should_succeed=True, return_text="ollama response")

    chain = FallbackChainAIProvider([
        ("Groq", groq),
        ("NVIDIA NIM", nvidia),
        ("OpenRouter", openrouter),
        ("Ollama", ollama),
    ])

    res = chain.generate("prompt")
    assert res == "NVIDIA NIM: nvidia response"


def test_fallback_chain_fallback_to_openrouter():
    groq = DummyProvider("Groq", should_succeed=False)
    nvidia = DummyProvider("NVIDIA NIM", should_succeed=False)
    openrouter = DummyProvider("OpenRouter", should_succeed=True, return_text="openrouter response")
    ollama = DummyProvider("Ollama", should_succeed=True)

    chain = FallbackChainAIProvider([
        ("Groq", groq),
        ("NVIDIA NIM", nvidia),
        ("OpenRouter", openrouter),
        ("Ollama", ollama),
    ])

    res = chain.generate("prompt")
    assert res == "OpenRouter: openrouter response"


def test_fallback_chain_fallback_to_ollama():
    groq = DummyProvider("Groq", should_succeed=False)
    nvidia = DummyProvider("NVIDIA NIM", should_succeed=False)
    openrouter = DummyProvider("OpenRouter", should_succeed=False)
    ollama = DummyProvider("Ollama", should_succeed=True, return_text="ollama response")

    chain = FallbackChainAIProvider([
        ("Groq", groq),
        ("NVIDIA NIM", nvidia),
        ("OpenRouter", openrouter),
        ("Ollama", ollama),
    ])

    res = chain.generate("prompt")
    assert res == "Ollama: ollama response"


def test_fallback_chain_all_fail():
    groq = DummyProvider("Groq", should_succeed=False)
    nvidia = DummyProvider("NVIDIA NIM", should_succeed=False)
    openrouter = DummyProvider("OpenRouter", should_succeed=False)
    ollama = DummyProvider("Ollama", should_succeed=False)

    chain = FallbackChainAIProvider([
        ("Groq", groq),
        ("NVIDIA NIM", nvidia),
        ("OpenRouter", openrouter),
        ("Ollama", ollama),
    ])

    with pytest.raises(AppException) as exc_info:
        chain.generate("prompt")
    assert exc_info.value.code == "ALL_AI_PROVIDERS_FAILED"


def test_get_provider_default_order(mock_settings):
    provider = get_provider(mock_settings)
    assert isinstance(provider, FallbackChainAIProvider)
    names = [name for name, _ in provider.providers]
    assert names == ["Groq", "NVIDIA NIM", "OpenRouter", "Ollama"]
