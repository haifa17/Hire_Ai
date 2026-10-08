from __future__ import annotations

from abc import ABC, abstractmethod


class AIProvider(ABC):
    @abstractmethod
    def generate(self, prompt: str, json_mode: bool = True) -> str:
        raise NotImplementedError
