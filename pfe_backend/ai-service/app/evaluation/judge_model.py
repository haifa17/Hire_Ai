"""DeepEval "judge" model — wires DeepEval's LLM-as-a-judge metrics to the
same AI provider chain (Groq -> NVIDIA NIM -> OpenRouter -> Ollama) the app
already uses, instead of requiring a separate OpenAI/Anthropic key just for
evaluation.

Kept isolated in `app/evaluation/` (not imported by the running FastAPI app)
so a DeepEval/judge misconfiguration can only ever break `pytest
tests/evaluation/`, never the backend itself — see module docstring on
`app/observability/langsmith_tracing.py` for the same isolation principle
applied to tracing.
"""

from __future__ import annotations

from typing import Any

from deepeval.models.base_model import DeepEvalBaseLLM

from app.config.settings import get_settings
from app.providers.factory import FallbackChainAIProvider
from app.providers.groq_provider import GroqProvider
from app.providers.nvidia_nim_provider import NvidiaNimProvider
from app.providers.ollama_provider import OllamaProvider
from app.providers.openrouter_provider import OpenRouterProvider


class TalentBridgeJudgeModel(DeepEvalBaseLLM):
    """Adapts the project's `AIProvider` fallback chain to DeepEval's
    `DeepEvalBaseLLM` interface, so metrics like `AnswerRelevancyMetric` or
    `GEval` use the same Groq/NVIDIA/OpenRouter/Ollama models already
    configured for the app (via `AI_PROVIDER` and friends in `.env`) as the
    judge — no separate OpenAI key required.
    """

    def __init__(self, provider=None, model_name: str | None = None) -> None:
        settings = get_settings()
        self._provider = provider or FallbackChainAIProvider(
            providers=[
                ("Groq", GroqProvider(settings)),
                ("NVIDIA NIM", NvidiaNimProvider(settings)),
                ("OpenRouter", OpenRouterProvider(settings)),
                ("Ollama", OllamaProvider(settings)),
            ]
        )
        self._model_name = model_name or f"{settings.ai_provider}:{settings.active_model_name}"
        super().__init__(model=self._model_name)

    def load_model(self) -> "TalentBridgeJudgeModel":
        return self

    def generate(self, prompt: str, schema: Any = None, **kwargs: Any) -> str:
        # DeepEval calls `generate_with_schema(prompt, schema=SomeSchema)`
        # first and falls back to a schema-less call only if this raises
        # TypeError. We deliberately accept (and ignore) `schema` — our
        # providers already return JSON text (json_mode=True), and DeepEval
        # parses that JSON itself (see `trimAndLoadJson` in deepeval.metrics.utils),
        # so no native structured-output support is needed here.
        return self._provider.generate(prompt, json_mode=True)

    async def a_generate(self, prompt: str, schema: Any = None, **kwargs: Any) -> str:
        # The wrapped providers are synchronous (plain `requests` calls); run
        # them off the event loop so async DeepEval metrics don't block it.
        import asyncio

        return await asyncio.to_thread(self._provider.generate, prompt, json_mode=True)

    def get_model_name(self) -> str:
        return self._model_name


def get_judge_model() -> TalentBridgeJudgeModel:
    """Returns the shared judge model, or raises a clear error if no AI
    provider is configured at all (every provider needs its own API key /
    local Ollama; see .env.example)."""
    settings = get_settings()
    if not any(
        [
            settings.groq_api_key,
            settings.nvidia_nim_api_key,
            settings.openrouter_api_key,
        ]
    ):
        raise RuntimeError(
            "No AI provider is configured (GROQ_API_KEY / NVIDIA_NIM_API_KEY / "
            "OPENROUTER_API_KEY are all empty, and Ollama's reachability can't be "
            "checked upfront). DeepEval evaluation tests need a working provider "
            "to act as the judge model — configure at least one in .env, or run "
            "Ollama locally."
        )
    return TalentBridgeJudgeModel()
