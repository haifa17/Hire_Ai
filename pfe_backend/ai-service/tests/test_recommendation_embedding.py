from __future__ import annotations

from types import SimpleNamespace

from app.agents.recommendation.embedding_service import RecommendationEmbeddingService


def test_vector_search_uses_query_points_when_search_is_unavailable():
    service = object.__new__(RecommendationEmbeddingService)

    class QueryPointsOnlyClient:
        def query_points(self, **kwargs):
            self.kwargs = kwargs
            return SimpleNamespace(
                points=[
                    SimpleNamespace(id="job-1", score=0.91, payload={"entity_id": "job-1"}),
                ]
            )

    client = QueryPointsOnlyClient()
    service.qdrant = client

    results = service._search("recommendation_jobs", [0.1, 0.2, 0.3], 5, None)

    assert results == [
        {"id": "job-1", "score": 0.91, "payload": {"entity_id": "job-1"}},
    ]
    assert client.kwargs["collection_name"] == "recommendation_jobs"
    assert client.kwargs["query"] == [0.1, 0.2, 0.3]
    assert client.kwargs["limit"] == 5
    assert client.kwargs["with_payload"] is True


def test_vector_search_keeps_legacy_search_client_support():
    service = object.__new__(RecommendationEmbeddingService)

    class SearchClient:
        def search(self, **kwargs):
            self.kwargs = kwargs
            return [
                SimpleNamespace(id="candidate-1", score=0.84, payload={"entity_id": "candidate-1"}),
            ]

    client = SearchClient()
    service.qdrant = client

    results = service._search("recommendation_candidates", [0.4, 0.5], 3, None)

    assert results == [
        {"id": "candidate-1", "score": 0.84, "payload": {"entity_id": "candidate-1"}},
    ]
    assert client.kwargs["collection_name"] == "recommendation_candidates"
    assert client.kwargs["query_vector"] == [0.4, 0.5]
    assert client.kwargs["limit"] == 3
    assert client.kwargs["with_payload"] is True
