from __future__ import annotations

import hashlib
import logging
import math
from datetime import datetime, timezone
from typing import Any

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams

from app.config.settings import Settings
from app.schemas.matching import CandidateProfileSchema, JobOfferSchema
from app.utils.math import cosine_similarity

logger = logging.getLogger("smart-cv-ai-service")


_MODEL_CACHE = {}
# Models that failed to load in this process. A failed import of
# sentence-transformers can take minutes (e.g. when the OS blocks one of its
# DLLs), and an EmbeddingAgent is built per request, so without this every
# request would pay that cost again before falling back.
_MODEL_LOAD_FAILED: set[str] = set()


class EmbeddingAgent:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self.dimensions = max(settings.embedding_dimensions, 16)
        
        # Initialize intfloat/multilingual-e5-small sentence-transformer if possible
        self.model = None
        model_name = "intfloat/multilingual-e5-small"
        try:
            if model_name in _MODEL_LOAD_FAILED:
                raise RuntimeError("previous load attempt failed in this process")
            from sentence_transformers import SentenceTransformer
            if model_name not in _MODEL_CACHE:
                logger.info(f"Loading SentenceTransformer model {model_name}...")
                _MODEL_CACHE[model_name] = SentenceTransformer(model_name)
            self.model = _MODEL_CACHE[model_name]
            self.dimensions = 384  # multilingual-e5-small embedding size
            logger.info("intfloat/multilingual-e5-small sentence-transformer initialized successfully (reused from cache).")
        except Exception as e:
            if model_name not in _MODEL_LOAD_FAILED:
                _MODEL_LOAD_FAILED.add(model_name)
                logger.warning(f"Could not load SentenceTransformer (intfloat/multilingual-e5-small): {e}. Falling back to hash-based vectorizer.")

        # Initialize Qdrant client
        try:
            if settings.qdrant_url.startswith("http"):
                self.qdrant_client = QdrantClient(url=settings.qdrant_url, timeout=1.0)
            else:
                self.qdrant_client = QdrantClient(location=":memory:")
            self._ensure_qdrant_collection()
        except Exception as e:
            logger.warning(f"Failed to initialize QdrantClient: {e}. Using in-memory fallback Qdrant client.")
            self.qdrant_client = QdrantClient(location=":memory:")
            self._ensure_qdrant_collection()

    def _ensure_qdrant_collection(self, collection_name: str = "smart_cv") -> None:
        try:
            exists = self.qdrant_client.collection_exists(collection_name)
            if exists:
                info = self.qdrant_client.get_collection(collection_name)
                vectors_config = getattr(info.config.params, "vectors", None)
                existing_size = None
                if vectors_config:
                    if hasattr(vectors_config, "size"):
                        existing_size = vectors_config.size
                    elif isinstance(vectors_config, dict) and "size" in vectors_config:
                        existing_size = vectors_config["size"]
                
                if existing_size is not None and existing_size != self.dimensions:
                    logger.warning(
                        f"Qdrant collection {collection_name} dimension mismatch: "
                        f"expected {self.dimensions}, found {existing_size}. Recreating collection."
                    )
                    self.qdrant_client.delete_collection(collection_name)
                    exists = False
            
            if not exists:
                self.qdrant_client.create_collection(
                    collection_name=collection_name,
                    vectors_config=VectorParams(size=self.dimensions, distance=Distance.COSINE),
                )
                logger.info(f"Created Qdrant collection: {collection_name} with dimension {self.dimensions}")
        except Exception as e:
            logger.warning(f"Qdrant collection verification/creation failed: {e}")

    def embed_candidate(self, candidate: CandidateProfileSchema, store: bool = True) -> list[float]:
        text_parts = [
            candidate.identity.name,
            candidate.summary,
            candidate.location,
            " ".join(candidate.skillsRaw),
            " ".join([exp.title + " at " + exp.company for exp in candidate.experiences]),
        ]
        text_content = " ".join([p for p in text_parts if p])
        vector = self._get_vector(text_content)
        
        if store and candidate.id:
            try:
                point = PointStruct(
                    # usedforsecurity=False: this MD5 is only used to derive a stable
                    # Qdrant point id from a string id, never for anything cryptographic.
                    id=str(hashlib.md5(candidate.id.encode(), usedforsecurity=False).hexdigest())[:32],  # Convert UUID or string to 32-char hex
                    vector=vector,
                    payload={
                        "entity_id": candidate.id,
                        "entity_type": "candidate",
                        "name": candidate.identity.name,
                        "skills": candidate.skillsRaw,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                self.qdrant_client.upsert(collection_name="smart_cv", points=[point])
            except Exception as e:
                logger.warning(f"Failed to upsert candidate vector to Qdrant: {e}")

        return vector

    def embed_job_offer(self, job_offer: JobOfferSchema, store: bool = True) -> list[float]:
        text_parts = [
            job_offer.title,
            job_offer.company,
            job_offer.location,
            " ".join(job_offer.requiredSkillsRaw),
            " ".join(job_offer.niceToHaveSkillsRaw),
            " ".join(job_offer.missions),
        ]
        text_content = " ".join([p for p in text_parts if p])
        vector = self._get_vector(text_content)
        
        if store and job_offer.id:
            try:
                point = PointStruct(
                    # usedforsecurity=False: id derivation only, not cryptographic.
                    id=str(hashlib.md5(job_offer.id.encode(), usedforsecurity=False).hexdigest())[:32],
                    vector=vector,
                    payload={
                        "entity_id": job_offer.id,
                        "entity_type": "job_offer",
                        "title": job_offer.title,
                        "company": job_offer.company,
                        "required_skills": job_offer.requiredSkillsRaw,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                self.qdrant_client.upsert(collection_name="smart_cv", points=[point])
            except Exception as e:
                logger.warning(f"Failed to upsert job offer vector to Qdrant: {e}")

        return vector

    def similarity(self, left: list[float], right: list[float]) -> float:
        return cosine_similarity(left, right)

    def batch_index(self, entities: list[dict], entity_type: str) -> None:
        points = []
        for item in entities:
            try:
                entity_id = item.get("id")
                if not entity_id:
                    continue
                
                # Reconstruct content based on type
                if entity_type == "candidate":
                    schema = CandidateProfileSchema.model_validate(item)
                    vector = self.embed_candidate(schema, store=False)
                    payload = {
                        "entity_id": schema.id,
                        "entity_type": "candidate",
                        "name": schema.identity.name,
                        "skills": schema.skillsRaw,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }
                else:
                    schema = JobOfferSchema.model_validate(item)
                    vector = self.embed_job_offer(schema, store=False)
                    payload = {
                        "entity_id": schema.id,
                        "entity_type": "job_offer",
                        "title": schema.title,
                        "company": schema.company,
                        "required_skills": schema.requiredSkillsRaw,
                        "created_at": datetime.now(timezone.utc).isoformat(),
                    }

                point = PointStruct(
                    # usedforsecurity=False: id derivation only, not cryptographic.
                    id=str(hashlib.md5(entity_id.encode(), usedforsecurity=False).hexdigest())[:32],
                    vector=vector,
                    payload=payload
                )
                points.append(point)
            except Exception as e:
                logger.warning(f"Failed to build batch point for indexing: {e}")

        if points:
            try:
                self.qdrant_client.upsert(collection_name="smart_cv", points=points)
                logger.info(f"Batch indexed {len(points)} {entity_type} vectors in Qdrant successfully.")
            except Exception as e:
                logger.exception(f"Batch indexing in Qdrant failed: {e}")

    def _get_vector(self, text: str) -> list[float]:
        if self.model is not None:
            try:
                # E5 models require a "query: "/"passage: " instruction prefix to
                # produce well-separated embeddings; since candidates and job
                # offers are embedded symmetrically here (plain cosine similarity,
                # no distinct query/document roles), "query: " is used uniformly
                # as recommended for symmetric (STS-style) use of E5 models.
                embedding = self.model.encode(f"query: {text}")
                return [float(v) for v in embedding]
            except Exception as e:
                logger.warning(f"SentenceTransformer encoding failed: {e}.")
                raise RuntimeError(f"SentenceTransformer encoding failed: {e}") from e

        logger.warning("SentenceTransformer is not loaded; returning an empty vector.")
        return []
