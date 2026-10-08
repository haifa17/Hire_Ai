from __future__ import annotations

from typing import Any, Dict
import requests

from app.config.settings import Settings
from app.core.exceptions import AppException
from app.observability.langsmith_tracing import traceable
from app.providers.base import AIProvider


def _extract_openrouter_content(payload: Dict[str, Any]) -> str:
    choices = payload.get("choices")
    if not isinstance(choices, list) or not choices:
        raise AppException(
            code="OPENROUTER_BAD_RESPONSE",
            message="OpenRouter returned an unexpected payload",
            status_code=502,
            details=payload,
        )

    message = choices[0].get("message") if isinstance(choices[0], dict) else None
    content = message.get("content") if isinstance(message, dict) else None
    if not isinstance(content, str):
        raise AppException(
            code="OPENROUTER_BAD_RESPONSE",
            message="OpenRouter response does not contain text content",
            status_code=502,
            details=payload,
        )

    return content


class OpenRouterProvider(AIProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @traceable(run_type="llm", name="OpenRouterProvider.generate")
    def generate(self, prompt: str, json_mode: bool = True) -> str:
        if not self.settings.openrouter_api_key:
            raise AppException(
                code="OPENROUTER_API_KEY_MISSING",
                message="OpenRouter API key is not configured",
                status_code=500,
            )

        payload_json: dict[str, Any] = {
            "model": self.settings.openrouter_model,
            "temperature": 0.2 if json_mode else 0.7,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are an expert ATS resume assistant. "
                        "Return only valid JSON and no markdown wrappers."
                        if json_mode
                        else "You are an expert HR assistant. Provide clear, direct, and factual text."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
        }

        if json_mode:
            payload_json["response_format"] = {"type": "json_object"}

        try:
            response = requests.post(
                self.settings.openrouter_url,
                headers={
                    "Authorization": f"Bearer {self.settings.openrouter_api_key}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": "http://localhost:8001",
                    "X-Title": self.settings.app_name,
                },
                json=payload_json,
                timeout=self.settings.openrouter_timeout_seconds,
            )
        except requests.RequestException as exc:
            raise AppException(
                code="OPENROUTER_UNAVAILABLE",
                message="OpenRouter API is unavailable",
                status_code=503,
                details=str(exc),
            ) from exc

        if response.status_code != 200:
            raise AppException(
                code="OPENROUTER_BAD_RESPONSE",
                message="OpenRouter returned an error response",
                status_code=502,
                details={"status": response.status_code, "body": response.text},
            )

        return _extract_openrouter_content(response.json())
