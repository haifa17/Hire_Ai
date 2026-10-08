from __future__ import annotations

import os
from dataclasses import dataclass
from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from dotenv import load_dotenv

load_dotenv()


@dataclass(frozen=True)
class Settings:
    app_name: str
    app_host: str
    app_port: int
    ai_provider: str
    groq_api_key: str
    groq_model: str
    groq_url: str
    groq_timeout_seconds: int
    nvidia_nim_api_key: str
    nvidia_nim_model: str
    nvidia_nim_url: str
    nvidia_nim_timeout_seconds: int
    openrouter_api_key: str
    openrouter_model: str
    openrouter_url: str
    openrouter_timeout_seconds: int
    ollama_url: str
    ollama_model: str
    ollama_timeout_seconds: int
    embedding_dimensions: int
    database_url: str
    qdrant_url: str
    redis_url: str
    # ── Unified scoring engine (matching + recommendation, plan §5) ──────
    esco_data_dir: str
    unified_skills_weight: float
    unified_experience_weight: float
    unified_semantic_weight: float
    unified_education_weight: float
    unified_projects_weight: float
    unified_languages_weight: float
    unified_certifications_weight: float
    matching_semantic_summary_weight: float
    matching_semantic_skills_weight: float
    matching_semantic_experience_weight: float
    matching_fuzzy_threshold: int
    matching_cache_ttl_seconds: int
    lgbm_model_path: str
    langsmith_api_key: str
    langsmith_tracing: bool
    langsmith_project: str
    # ── Recommendation settings (retrieval/cache only — scoring now shares
    # the UNIFIED_* weights above) ───────────────────────────────────────
    rec_retrieval_top_k: int
    rec_final_top_k: int
    rec_cache_ttl_hours: int
    rec_candidates_collection: str
    rec_jobs_collection: str

    @property
    def active_model_name(self) -> str:
        if self.ai_provider == "groq":
            return self.groq_model
        elif self.ai_provider == "nvidia" or self.ai_provider == "nvidia_nim":
            return self.nvidia_nim_model
        elif self.ai_provider == "openrouter":
            return self.openrouter_model
        return self.ollama_model

    @property
    def async_database_url(self) -> str:
        """DATABASE_URL adapted for SQLAlchemy's asyncpg driver.

        The URL is shared with Prisma/libpq-style tooling, whose query
        parameters asyncpg rejects: `schema` (Prisma only) and
        `channel_binding` are dropped, and `sslmode=require` (as used by hosted
        Postgres such as Neon) becomes asyncpg's `ssl=require`.
        """
        url = self.database_url
        if url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

        parts = urlsplit(url)
        params = []
        for key, value in parse_qsl(parts.query, keep_blank_values=True):
            if key in ("schema", "channel_binding"):
                continue
            params.append(("ssl" if key == "sslmode" else key, value))
        return urlunsplit(parts._replace(query=urlencode(params)))


def _to_int(value: str | None, default: int) -> int:
    if value is None:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def _to_float(value: str | None, default: float) -> float:
    if value is None:
        return default
    try:
        return float(value)
    except ValueError:
        return default


def load_settings() -> Settings:
    return Settings(
        app_name=os.getenv("AI_SERVICE_NAME", "TalentBridge AI Service"),
        app_host=os.getenv("AI_SERVICE_HOST", "0.0.0.0"),
        app_port=_to_int(os.getenv("AI_SERVICE_PORT"), 8001),
        ai_provider=os.getenv("AI_PROVIDER", "groq").strip().lower(),
        groq_api_key=os.getenv("GROQ_API_KEY", "").strip(),
        groq_model=os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile"),
        groq_url=os.getenv(
            "GROQ_URL", "https://api.groq.com/openai/v1/chat/completions"
        ),
        groq_timeout_seconds=_to_int(os.getenv("GROQ_TIMEOUT_SECONDS"), 120),
        nvidia_nim_api_key=os.getenv("NVIDIA_NIM_API_KEY", os.getenv("NVIDIA_API_KEY", "")).strip(),
        nvidia_nim_model=os.getenv("NVIDIA_NIM_MODEL", "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning"),
        nvidia_nim_url=os.getenv("NVIDIA_NIM_URL", "https://integrate.api.nvidia.com/v1/chat/completions"),
        nvidia_nim_timeout_seconds=_to_int(os.getenv("NVIDIA_NIM_TIMEOUT_SECONDS"), 120),
        openrouter_api_key=os.getenv("OPENROUTER_API_KEY", "").strip(),
        openrouter_model=os.getenv("OPENROUTER_MODEL", "gpt-oss-20b"),
        openrouter_url=os.getenv("OPENROUTER_URL", "https://openrouter.ai/api/v1/chat/completions"),
        openrouter_timeout_seconds=_to_int(os.getenv("OPENROUTER_TIMEOUT_SECONDS"), 120),
        ollama_url=os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate"),
        ollama_model=os.getenv("OLLAMA_MODEL", "llama3.1:8b"),
        ollama_timeout_seconds=_to_int(os.getenv("OLLAMA_TIMEOUT_SECONDS"), 300),
        embedding_dimensions=_to_int(os.getenv("EMBEDDING_DIMENSIONS"), 384),
        database_url=os.getenv("DATABASE_URL", "postgresql://postgres:nour@localhost:5433/hire_ai"),
        qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
        # ── Unified scoring engine defaults (plan §5 — sum to 1.00) ───────
        esco_data_dir=os.getenv("ESCO_DATA_DIR", "data/esco"),
        unified_skills_weight=_to_float(os.getenv("UNIFIED_SKILLS_WEIGHT"), 0.30),
        unified_experience_weight=_to_float(os.getenv("UNIFIED_EXPERIENCE_WEIGHT"), 0.20),
        unified_semantic_weight=_to_float(os.getenv("UNIFIED_SEMANTIC_WEIGHT"), 0.20),
        unified_education_weight=_to_float(os.getenv("UNIFIED_EDUCATION_WEIGHT"), 0.12),
        unified_projects_weight=_to_float(os.getenv("UNIFIED_PROJECTS_WEIGHT"), 0.10),
        unified_languages_weight=_to_float(os.getenv("UNIFIED_LANGUAGES_WEIGHT"), 0.05),
        unified_certifications_weight=_to_float(os.getenv("UNIFIED_CERTIFICATIONS_WEIGHT"), 0.03),
        matching_semantic_summary_weight=_to_float(os.getenv("MATCHING_SEMANTIC_SUMMARY_WEIGHT"), 0.20),
        matching_semantic_skills_weight=_to_float(os.getenv("MATCHING_SEMANTIC_SKILLS_WEIGHT"), 0.50),
        matching_semantic_experience_weight=_to_float(os.getenv("MATCHING_SEMANTIC_EXPERIENCE_WEIGHT"), 0.30),
        matching_fuzzy_threshold=_to_int(os.getenv("MATCHING_FUZZY_THRESHOLD"), 85),
        matching_cache_ttl_seconds=_to_int(os.getenv("MATCHING_CACHE_TTL_SECONDS"), 86400),
        lgbm_model_path=os.getenv("LGBM_MODEL_PATH", ""),
        langsmith_api_key=os.getenv("LANGSMITH_API_KEY", "").strip(),
        langsmith_tracing=os.getenv("LANGSMITH_TRACING", "false").strip().lower() == "true",
        langsmith_project=os.getenv("LANGSMITH_PROJECT", "talentbridge-matching"),
        # ── Recommendation defaults (retrieval/cache only) ────────────────
        # Lowered from 100: this many items go through full fine-scoring
        # (rule-based + semantic) sequentially before being sliced down to
        # the final top 5 — fewer retrieved items means a much faster
        # response with little loss in recommendation quality, since Qdrant
        # already orders these by relevance.
        rec_retrieval_top_k=_to_int(os.getenv("REC_RETRIEVAL_TOP_K"), 30),
        rec_final_top_k=_to_int(os.getenv("REC_FINAL_TOP_K"), 10),
        rec_cache_ttl_hours=_to_int(os.getenv("REC_CACHE_TTL_HOURS"), 24),
        rec_candidates_collection=os.getenv("REC_CANDIDATES_COLLECTION", "recommendation_candidates"),
        rec_jobs_collection=os.getenv("REC_JOBS_COLLECTION", "recommendation_jobs"),
    )


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
