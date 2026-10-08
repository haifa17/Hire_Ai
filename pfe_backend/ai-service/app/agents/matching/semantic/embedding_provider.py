"""Thin wrapper around the shared intfloat/multilingual-e5-small model instance.

Reuses `EmbeddingAgent`'s module-level `_MODEL_CACHE` (via the `model`
attribute passed in) rather than loading a second copy of the model — the
matching module and the recommendation module both need dense embeddings and
should share one loaded model.
"""
from __future__ import annotations

import logging

logger = logging.getLogger("smart-cv-ai-service")


class SectionEmbeddingProvider:
    def __init__(self, model) -> None:
        self.model = model

    @property
    def available(self) -> bool:
        return self.model is not None

    def encode(self, text: str) -> list[float] | None:
        if not self.model or not text.strip():
            return None
        try:
            # "query: " prefix recommended by E5 models for symmetric use.
            vector = self.model.encode(f"query: {text}")
            return [float(v) for v in vector]
        except Exception as e:
            logger.warning(f"multilingual-e5-small encoding failed: {e}")
            return None

    def encode_sections(self, sections: dict[str, str]) -> dict[str, list[float] | None]:
        """Encodes all sections in a single batched `model.encode(list)` call
        instead of one call per section — sentence-transformers batches the
        forward pass internally, which is materially faster than N separate
        `.encode(str)` calls (each with its own tokenization/padding overhead)
        for the small (2-3 item) section lists used here."""
        if not self.model:
            return {name: None for name in sections}

        names = [name for name, text in sections.items() if text.strip()]
        texts = [f"query: {sections[name]}" for name in names]
        if not texts:
            return {name: None for name in sections}

        try:
            vectors = self.model.encode(texts)
            encoded = {name: [float(v) for v in vec] for name, vec in zip(names, vectors)}
        except Exception as e:
            logger.warning(f"multilingual-e5-small batched encoding failed: {e}")
            encoded = {}

        return {name: encoded.get(name) for name in sections}
