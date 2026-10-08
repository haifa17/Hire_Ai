"""Per-section vector storage in Qdrant (summary / skills / experience),
separate from the legacy single "smart_cv" collection used by EmbeddingAgent.
"""
from __future__ import annotations

import hashlib
import logging

from qdrant_client import QdrantClient
from qdrant_client.http.models import Distance, PointStruct, VectorParams

logger = logging.getLogger("smart-cv-ai-service")

CV_SECTIONS_COLLECTION = "cv_sections"
JOB_SECTIONS_COLLECTION = "job_sections"
SECTION_NAMES = ("summary", "skills", "experience")


class SectionVectorStore:
    def __init__(self, client: QdrantClient, dimensions: int = 384) -> None:
        self.client = client
        self.dimensions = dimensions
        for collection in (CV_SECTIONS_COLLECTION, JOB_SECTIONS_COLLECTION):
            self._ensure_collection(collection)

    def _ensure_collection(self, name: str) -> None:
        try:
            if not self.client.collection_exists(name):
                self.client.create_collection(
                    collection_name=name,
                    vectors_config={
                        section: VectorParams(size=self.dimensions, distance=Distance.COSINE)
                        for section in SECTION_NAMES
                    },
                )
                logger.info(f"Created Qdrant collection {name} with per-section named vectors.")
        except Exception as e:
            logger.warning(f"Qdrant collection setup failed for {name}: {e}")

    @staticmethod
    def _point_id(entity_id: str) -> str:
        return hashlib.md5(entity_id.encode()).hexdigest()[:32]

    def upsert(self, collection: str, entity_id: str, vectors: dict[str, list[float]]) -> None:
        usable_vectors = {k: v for k, v in vectors.items() if v}
        if not usable_vectors:
            return
        try:
            self.client.upsert(
                collection_name=collection,
                points=[PointStruct(id=self._point_id(entity_id), vector=usable_vectors, payload={"entity_id": entity_id})],
            )
        except Exception as e:
            logger.warning(f"Failed to upsert section vectors for {entity_id} into {collection}: {e}")

    def get(self, collection: str, entity_id: str) -> dict[str, list[float]] | None:
        try:
            points = self.client.retrieve(collection_name=collection, ids=[self._point_id(entity_id)], with_vectors=True)
            if points:
                return points[0].vector
        except Exception as e:
            logger.warning(f"Failed to retrieve section vectors for {entity_id} from {collection}: {e}")
        return None
