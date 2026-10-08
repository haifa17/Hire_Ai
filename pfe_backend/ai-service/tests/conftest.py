from __future__ import annotations

import sys
from unittest.mock import MagicMock

# Force sentence_transformers import to fail so tests fall back to local hash-based vectorizer
sys.modules["sentence_transformers"] = None

# Mock qdrant_client to prevent any network calls during tests
mock_qdrant = MagicMock()
sys.modules["qdrant_client"] = mock_qdrant
sys.modules["qdrant_client.http.models"] = mock_qdrant
