"""Embedding Service – manages Qdrant collections and vector operations for recommendations."""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import (
    Distance,
    PointStruct,
    VectorParams,
)

from app.config.settings import Settings

logger = logging.getLogger("smart-cv-ai-service")

# Singleton cache so the model is only loaded once across the process
_MODEL_CACHE: dict[str, Any] = {}


class RecommendationEmbeddingService:
    """Manages intfloat/multilingual-e5-small embeddings and two dedicated
    Qdrant collections (``recommendation_candidates`` and
    ``recommendation_jobs``) with rich metadata payloads for filtered hybrid
    search."""

    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.dimensions = 384  # multilingual-e5-small default
        self.candidates_collection = settings.rec_candidates_collection
        self.jobs_collection = settings.rec_jobs_collection

        # ── Load multilingual-e5-small model (shared with matching) ───────
        self.model = None
        try:
            from sentence_transformers import SentenceTransformer

            model_name = "intfloat/multilingual-e5-small"
            if model_name not in _MODEL_CACHE:
                logger.info(f"[RecommendationEmbedding] Loading SentenceTransformer {model_name}…")
                _MODEL_CACHE[model_name] = SentenceTransformer(model_name)
            self.model = _MODEL_CACHE[model_name]
            logger.info("[RecommendationEmbedding] multilingual-e5-small ready (reused from cache).")
        except Exception as e:
            logger.warning(f"[RecommendationEmbedding] Could not load multilingual-e5-small: {e}")

        # ── Qdrant client ────────────────────────────────────────────────
        try:
            if settings.qdrant_url.startswith("http"):
                self.qdrant = QdrantClient(url=settings.qdrant_url, timeout=5.0)
            else:
                self.qdrant = QdrantClient(location=":memory:")
            self._ensure_collection(self.candidates_collection)
            self._ensure_collection(self.jobs_collection)
        except Exception as e:
            logger.warning(f"[RecommendationEmbedding] Qdrant init failed: {e}. Using in-memory.")
            self.qdrant = QdrantClient(location=":memory:")
            self._ensure_collection(self.candidates_collection)
            self._ensure_collection(self.jobs_collection)

    # ── Public API ────────────────────────────────────────────────────────

    def encode(self, text: str) -> list[float]:
        """Generate a 384-dim embedding for the given text."""
        target_text = (text or "").strip()
        if not target_text:
            target_text = "candidate looking for job opportunities"

        if self.model is not None:
            try:
                # "query: " prefix recommended by E5 models for symmetric use
                # (both candidates and jobs are embedded the same way here).
                embedding = self.model.encode(f"query: {target_text}")
                return [float(v) for v in embedding]
            except Exception as e:
                logger.warning(f"[RecommendationEmbedding] Encoding failed with SentenceTransformer: {e}")

        # Fallback: deterministic vector using python hash of target_text
        import random
        rng = random.Random(hash(target_text))
        return [round(rng.uniform(-0.1, 0.1), 6) for _ in range(self.dimensions)]

    def upsert_candidate(self, candidate_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        """Store a candidate vector with metadata in the recommendation_candidates collection."""
        point_id = self._deterministic_id(candidate_id)
        point = PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "entity_id": candidate_id,
                "entity_type": "candidate",
                **payload,
                "indexed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        try:
            self.qdrant.upsert(collection_name=self.candidates_collection, points=[point])
        except Exception as e:
            logger.exception(f"[RecommendationEmbedding] Failed to upsert candidate {candidate_id}: {e}")

    def upsert_job(self, job_id: str, vector: list[float], payload: dict[str, Any]) -> None:
        """Store a job vector with metadata in the recommendation_jobs collection."""
        point_id = self._deterministic_id(job_id)
        point = PointStruct(
            id=point_id,
            vector=vector,
            payload={
                "entity_id": job_id,
                "entity_type": "job",
                **payload,
                "indexed_at": datetime.now(timezone.utc).isoformat(),
            },
        )
        try:
            self.qdrant.upsert(collection_name=self.jobs_collection, points=[point])
        except Exception as e:
            logger.exception(f"[RecommendationEmbedding] Failed to upsert job {job_id}: {e}")

    def batch_upsert_candidates(self, items: list[dict[str, Any]]) -> int:
        """Batch-upsert candidate vectors. Each item must have 'id', 'vector', and 'payload'."""
        return self._batch_upsert(self.candidates_collection, items, "candidate")

    def batch_upsert_jobs(self, items: list[dict[str, Any]]) -> int:
        """Batch-upsert job vectors. Each item must have 'id', 'vector', and 'payload'."""
        return self._batch_upsert(self.jobs_collection, items, "job")

    def search_jobs(
        self,
        query_vector: list[float],
        limit: int = 100,
        filter_conditions: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Dense vector search in the jobs collection."""
        return self._search(self.jobs_collection, query_vector, limit, filter_conditions)

    def search_candidates(
        self,
        query_vector: list[float],
        limit: int = 100,
        filter_conditions: dict[str, Any] | None = None,
    ) -> list[dict[str, Any]]:
        """Dense vector search in the candidates collection."""
        return self._search(self.candidates_collection, query_vector, limit, filter_conditions)

    def get_collection_count(self, collection_name: str) -> int:
        """Return the number of vectors in a collection."""
        try:
            info = self.qdrant.get_collection(collection_name)
            return info.points_count or 0
        except Exception:
            return 0

    # ── Private helpers ───────────────────────────────────────────────────

    def _ensure_collection(self, name: str) -> None:
        try:
            exists = self.qdrant.collection_exists(name)
            if exists:
                info = self.qdrant.get_collection(name)
                vectors_config = getattr(info.config.params, "vectors", None)
                existing_size = None
                if vectors_config:
                    if hasattr(vectors_config, "size"):
                        existing_size = vectors_config.size
                    elif isinstance(vectors_config, dict) and "size" in vectors_config:
                        existing_size = vectors_config["size"]
                if existing_size is not None and existing_size != self.dimensions:
                    logger.warning(
                        f"[RecommendationEmbedding] Collection {name} dimension mismatch "
                        f"({existing_size} vs {self.dimensions}). Recreating."
                    )
                    self.qdrant.delete_collection(name)
                    exists = False
            if not exists:
                self.qdrant.create_collection(
                    collection_name=name,
                    vectors_config=VectorParams(size=self.dimensions, distance=Distance.COSINE),
                )
                logger.info(f"[RecommendationEmbedding] Created collection: {name} ({self.dimensions}D)")
        except Exception as e:
            logger.warning(f"[RecommendationEmbedding] Collection setup for {name} failed: {e}")

    def _deterministic_id(self, entity_id: str) -> str:
        """Convert a UUID string to a deterministic 32-char hex string for Qdrant."""
        # usedforsecurity=False: id derivation only, not cryptographic.
        return hashlib.md5(entity_id.encode(), usedforsecurity=False).hexdigest()[:32]

    def _batch_upsert(self, collection: str, items: list[dict[str, Any]], entity_type: str) -> int:
        points: list[PointStruct] = []
        for item in items:
            eid = item.get("id")
            vector = item.get("vector")
            payload = item.get("payload", {})
            if not eid or not vector:
                continue
            points.append(
                PointStruct(
                    id=self._deterministic_id(eid),
                    vector=vector,
                    payload={
                        "entity_id": eid,
                        "entity_type": entity_type,
                        **payload,
                        "indexed_at": datetime.now(timezone.utc).isoformat(),
                    },
                )
            )
        if not points:
            return 0
        try:
            # Qdrant supports batch upsert up to ~1000 points per call
            batch_size = 500
            for i in range(0, len(points), batch_size):
                self.qdrant.upsert(collection_name=collection, points=points[i : i + batch_size])
            logger.info(f"[RecommendationEmbedding] Batch-upserted {len(points)} {entity_type}s in {collection}")
            return len(points)
        except Exception as e:
            logger.exception(f"[RecommendationEmbedding] Batch upsert failed: {e}")
            return 0

    def _search(
        self,
        collection: str,
        query_vector: list[float],
        limit: int,
        filter_conditions: dict[str, Any] | None,
    ) -> list[dict[str, Any]]:
        """Execute a vector similarity search with optional Qdrant filters."""
        try:
            from qdrant_client.http.models import Filter, FieldCondition, MatchValue, Range

            qdrant_filter = None
            if filter_conditions:
                must_clauses: list[FieldCondition] = []
                for field, condition in filter_conditions.items():
                    if isinstance(condition, dict):
                        # Range filter: {"gte": 0, "lte": 10}
                        must_clauses.append(
                            FieldCondition(key=field, range=Range(**condition))
                        )
                    else:
                        # Exact match
                        must_clauses.append(
                            FieldCondition(key=field, match=MatchValue(value=condition))
                        )
                if must_clauses:
                    qdrant_filter = Filter(must=must_clauses)

            results = self._execute_vector_search(
                collection=collection,
                query_vector=query_vector,
                limit=limit,
                qdrant_filter=qdrant_filter,
            )
            return [
                {
                    "id": hit.id,
                    "score": hit.score,
                    "payload": hit.payload or {},
                }
                for hit in results
            ]
        except Exception as e:
            logger.exception(f"[RecommendationEmbedding] Search in {collection} failed: {e}")
            return []

    def _execute_vector_search(
        self,
        collection: str,
        query_vector: list[float],
        limit: int,
        qdrant_filter: Any | None,
    ) -> list[Any]:
        """Run vector search across Qdrant client versions.

        qdrant-client >=1.10 exposes ``query_points`` instead of the older
        ``search`` convenience method. Keep both paths so deployments pinned to
        either API can retrieve recommendations.
        """
        if hasattr(self.qdrant, "query_points"):
            response = self.qdrant.query_points(
                collection_name=collection,
                query=query_vector,
                limit=limit,
                query_filter=qdrant_filter,
                with_payload=True,
            )
            return list(getattr(response, "points", response))

        return list(
            self.qdrant.search(
                collection_name=collection,
                query_vector=query_vector,
                limit=limit,
                query_filter=qdrant_filter,
                with_payload=True,
            )
        )
