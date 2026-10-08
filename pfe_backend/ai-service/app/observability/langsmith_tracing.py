"""LangSmith observability integration.

Centralizes everything LangSmith-related (tracing setup + the `traceable`
decorator used across providers/agents/orchestrator) so tracing code never
gets duplicated ad hoc throughout the codebase.

Design goals:
  - Fully optional: with no LANGSMITH_API_KEY configured, tracing is a no-op
    and the app behaves exactly as before.
  - Never blocks the main flow: any error configuring or emitting traces
    (network issues, LangSmith outage, bad credentials) is caught and logged
    as a warning, never raised. AI generation / matching must keep working
    even if LangSmith is completely unreachable.
"""

from __future__ import annotations

import logging
import os
from functools import wraps
from typing import Any, Callable, TypeVar

from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")

F = TypeVar("F", bound=Callable[..., Any])

_configured = False
_enabled = False

try:
    from langsmith import traceable as _langsmith_traceable

    _LANGSMITH_AVAILABLE = True
except Exception:  # pragma: no cover - defensive, langsmith is a normal dependency
    _LANGSMITH_AVAILABLE = False
    _langsmith_traceable = None  # type: ignore[assignment]


def configure_langsmith(settings: Settings) -> None:
    """Enable LangSmith tracing when configured.

    Sets the environment variables the LangSmith SDK (and LangChain/LangGraph's
    built-in tracing hooks) read at call time: LANGSMITH_TRACING,
    LANGSMITH_API_KEY, LANGSMITH_PROJECT. A no-op when no API key is present,
    the langsmith package isn't installed, or LANGSMITH_TRACING is explicitly
    set to false — so LangSmith stays fully optional with zero cost/dependency
    for local dev, tests, or CI.
    """
    global _configured, _enabled
    _configured = True

    if not _LANGSMITH_AVAILABLE:
        logger.info("langsmith package not installed; LangSmith tracing disabled.")
        _enabled = False
        return

    if not settings.langsmith_api_key:
        logger.info("LANGSMITH_API_KEY not set; LangSmith tracing disabled.")
        _enabled = False
        return

    if not settings.langsmith_tracing:
        logger.info("LANGSMITH_TRACING is false; LangSmith tracing disabled.")
        _enabled = False
        return

    try:
        os.environ["LANGSMITH_TRACING"] = "true"
        os.environ["LANGSMITH_API_KEY"] = settings.langsmith_api_key
        os.environ["LANGSMITH_PROJECT"] = settings.langsmith_project
        # Also set the legacy LANGCHAIN_* aliases some LangChain/LangGraph
        # internals still read, so tracing works regardless of SDK version.
        os.environ.setdefault("LANGCHAIN_TRACING_V2", "true")
        os.environ.setdefault("LANGCHAIN_API_KEY", settings.langsmith_api_key)
        os.environ.setdefault("LANGCHAIN_PROJECT", settings.langsmith_project)
        _enabled = True
        logger.info(f"LangSmith tracing enabled for project '{settings.langsmith_project}'.")
    except Exception as exc:  # never let observability setup break startup
        logger.warning(f"Failed to configure LangSmith tracing: {exc}")
        _enabled = False


def is_enabled() -> bool:
    return _enabled


def traceable(*trace_args: Any, **trace_kwargs: Any) -> Callable[[F], F]:
    """Drop-in wrapper around `langsmith.traceable`.

    Use exactly like `@langsmith.traceable(...)` on any sync/async function
    (LLM provider calls, LangGraph pipeline nodes, agent methods). Behaves as
    a transparent passthrough decorator when LangSmith isn't installed or
    tracing hasn't been enabled via `configure_langsmith`, and swallows any
    runtime error raised *by the tracing wrapper itself* so a LangSmith
    outage can never break the traced function's normal execution.
    """

    def decorator(func: F) -> F:
        if not _LANGSMITH_AVAILABLE:
            return func

        traced_func = _langsmith_traceable(*trace_args, **trace_kwargs)(func)

        # langsmith's own `traceable` wrapper already isolates trace-submission
        # failures (network issues, LangSmith outages) from the wrapped
        # function's execution — it logs and drops the trace rather than
        # raising. We only need to choose between the traced and untraced
        # path here; any exception that does propagate is a real error from
        # the wrapped function itself and should propagate normally.
        if _is_async(func):
            @wraps(func)
            async def async_wrapper(*args: Any, **kwargs: Any) -> Any:
                if not _enabled:
                    return await func(*args, **kwargs)
                return await traced_func(*args, **kwargs)
            return async_wrapper  # type: ignore[return-value]

        @wraps(func)
        def sync_wrapper(*args: Any, **kwargs: Any) -> Any:
            if not _enabled:
                return func(*args, **kwargs)
            return traced_func(*args, **kwargs)
        return sync_wrapper  # type: ignore[return-value]

    return decorator


def _is_async(func: Callable[..., Any]) -> bool:
    import inspect

    return inspect.iscoroutinefunction(func)
