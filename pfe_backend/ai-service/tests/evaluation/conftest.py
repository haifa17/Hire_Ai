from __future__ import annotations

import os

import pytest

# Opt out of DeepEval's anonymous telemetry (posthog) before deepeval is
# imported anywhere in this session — keeps evaluation runs fully local and
# avoids an extra outbound network dependency in CI.
os.environ.setdefault("DEEPEVAL_TELEMETRY_OPT_OUT", "YES")

pytestmark = pytest.mark.evaluation


@pytest.fixture(scope="session")
def judge_model():
    """The DeepEval judge model, backed by whichever AI provider is
    configured (see app/evaluation/judge_model.py). Skips the whole
    evaluation session — rather than erroring — when no provider is
    configured, since these tests need a live LLM and are not expected to
    run in every environment (e.g. a contributor's machine with no API keys)."""
    from app.evaluation.judge_model import get_judge_model

    try:
        return get_judge_model()
    except RuntimeError as exc:
        pytest.skip(str(exc))


@pytest.fixture(scope="session")
def ai_provider(judge_model):
    """The raw AIProvider chain backing the judge model — reused directly by
    agents under test so evaluation tests exercise the exact same provider
    fallback chain (Groq -> NVIDIA NIM -> OpenRouter -> Ollama) as production."""
    return judge_model._provider
