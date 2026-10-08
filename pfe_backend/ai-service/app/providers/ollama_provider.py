from __future__ import annotations

from typing import Optional, Any
import requests

from app.config.settings import Settings
from app.core.exceptions import AppException
from app.observability.langsmith_tracing import traceable
from app.providers.base import AIProvider


class OllamaProvider(AIProvider):
    def __init__(self, settings: Settings) -> None:
        self.settings = settings

    @traceable(run_type="llm", name="OllamaProvider.generate")
    def generate(self, prompt: str, json_mode: bool = True) -> str:
        candidate_urls = [self.settings.ollama_url]
        if "localhost" in self.settings.ollama_url:
            candidate_urls.append(self.settings.ollama_url.replace("localhost", "127.0.0.1"))
        elif "127.0.0.1" in self.settings.ollama_url:
            candidate_urls.append(self.settings.ollama_url.replace("127.0.0.1", "localhost"))

        last_error: Optional[str] = None
        for url in candidate_urls:
            json_body: dict[str, Any] = {
                "model": self.settings.ollama_model,
                "prompt": prompt,
                "stream": False,
            }
            if json_mode:
                json_body["format"] = "json"

            try:
                response = requests.post(
                    url,
                    json=json_body,
                    timeout=self.settings.ollama_timeout_seconds,
                )
            except requests.RequestException as exc:
                last_error = str(exc)
                continue

            if response.status_code != 200:
                raise AppException(
                    code="OLLAMA_BAD_RESPONSE",
                    message="Failed to communicate with local Ollama",
                    status_code=502,
                    details={"status": response.status_code, "body": response.text},
                )

            payload = response.json()
            content = payload.get("response")
            if isinstance(content, str):
                return content

            raise AppException(
                code="OLLAMA_BAD_RESPONSE",
                message="Ollama returned an unexpected payload",
                status_code=502,
                details=payload,
            )

        raise AppException(
            code="OLLAMA_UNAVAILABLE",
            message="AI model service is unavailable",
            status_code=503,
            details=last_error,
        )
