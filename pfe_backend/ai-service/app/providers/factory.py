from __future__ import annotations

import logging
from typing import List, Tuple
from fastapi import Depends

from app.config.settings import Settings, get_settings
from app.core.exceptions import AppException
from app.providers.base import AIProvider
from app.providers.groq_provider import GroqProvider
from app.providers.nvidia_nim_provider import NvidiaNimProvider
from app.providers.openrouter_provider import OpenRouterProvider
from app.providers.ollama_provider import OllamaProvider

logger = logging.getLogger("smart-cv-ai-service")

PROVIDER_GROQ = "Groq"
PROVIDER_NVIDIA_NIM = "NVIDIA NIM"
PROVIDER_OPENROUTER = "OpenRouter"
PROVIDER_OLLAMA = "Ollama"


class FallbackChainAIProvider(AIProvider):
    """
    Executes a sequence of AI providers in order.
    If a provider fails, logs a warning and tries the next provider in the fallback chain.
    """

    def __init__(self, providers: List[Tuple[str, AIProvider]]) -> None:
        if not providers:
            raise ValueError("FallbackChainAIProvider requires at least one provider.")
        self.providers = providers

    def generate(self, prompt: str, json_mode: bool = True) -> str:
        errors: List[str] = []
        for name, provider in self.providers:
            try:
                return provider.generate(prompt, json_mode=json_mode)
            except Exception as e:
                logger.warning(
                    f"Provider '{name}' ({provider.__class__.__name__}) failed: {e}. "
                    "Attempting next provider in fallback chain..."
                )
                errors.append(f"{name}: {e}")

        raise AppException(
            code="ALL_AI_PROVIDERS_FAILED",
            message="All AI providers in the fallback chain failed.",
            status_code=503,
            details=" | ".join(errors),
        )


class FallbackAIProvider(FallbackChainAIProvider):
    """
    Legacy two-provider fallback wrapper kept for backward compatibility.
    """

    def __init__(self, primary: AIProvider, fallback: AIProvider) -> None:
        super().__init__([
            (primary.__class__.__name__, primary),
            (fallback.__class__.__name__, fallback),
        ])


def get_provider(settings: Settings = Depends(get_settings)) -> AIProvider:
    groq = GroqProvider(settings)
    nvidia = NvidiaNimProvider(settings)
    openrouter = OpenRouterProvider(settings)
    ollama = OllamaProvider(settings)

    # Primary order specified: Groq -> NVIDIA NIM -> OpenRouter -> Ollama
    default_chain = [
        (PROVIDER_GROQ, groq),
        (PROVIDER_NVIDIA_NIM, nvidia),
        (PROVIDER_OPENROUTER, openrouter),
        (PROVIDER_OLLAMA, ollama),
    ]

    primary = (settings.ai_provider or "groq").strip().lower()

    if primary in ("nvidia", "nvidia_nim", "nemotron"):
        ordered_chain = [
            (PROVIDER_NVIDIA_NIM, nvidia),
            (PROVIDER_GROQ, groq),
            (PROVIDER_OPENROUTER, openrouter),
            (PROVIDER_OLLAMA, ollama),
        ]
    elif primary == "openrouter":
        ordered_chain = [
            (PROVIDER_OPENROUTER, openrouter),
            (PROVIDER_GROQ, groq),
            (PROVIDER_NVIDIA_NIM, nvidia),
            (PROVIDER_OLLAMA, ollama),
        ]
    elif primary == "ollama":
        ordered_chain = [
            (PROVIDER_OLLAMA, ollama),
            (PROVIDER_GROQ, groq),
            (PROVIDER_NVIDIA_NIM, nvidia),
            (PROVIDER_OPENROUTER, openrouter),
        ]
    else:
        # Default chain: Groq -> NVIDIA NIM -> OpenRouter -> Ollama
        ordered_chain = default_chain

    return FallbackChainAIProvider(providers=ordered_chain)
