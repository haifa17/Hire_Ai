"""Optional MCP tool surface for the matching engine.

Exposes ESCO/rapidfuzz skill normalization as an MCP tool so an external MCP
client (an IDE, a debugging console, another agent) can inspect how a raw
term resolves without going through the full matching pipeline. This is a
single-process microservice, so there is no real network A2A protocol
between the LangGraph nodes themselves — each node already exchanges typed
Pydantic messages (`GraphState` fields) which plays the same role locally.
Registering this MCP server is opt-in and never required for `/api/ai/matching/run`
to work.
"""
from __future__ import annotations

import logging

from app.agents.matching.normalization import NormalizationAgent
from app.agents.matching.rule_based.esco_taxonomy import load_esco_taxonomy
from app.agents.matching.rule_based.normalize import normalize_to_esco
from app.config.settings import get_settings

logger = logging.getLogger("smart-cv-ai-service")

try:
    from mcp.server.fastmcp import FastMCP

    _MCP_AVAILABLE = True
except ImportError:  # `mcp` SDK is optional — not in requirements.txt by default
    _MCP_AVAILABLE = False


def build_mcp_server():
    """Returns a FastMCP server exposing `normalize_skill`, or None if the
    optional `mcp` package isn't installed."""
    if not _MCP_AVAILABLE:
        logger.info("`mcp` package not installed — matching MCP tool server disabled.")
        return None

    settings = get_settings()
    esco = load_esco_taxonomy(settings)
    normalizer = NormalizationAgent(settings)

    server = FastMCP("talentbridge-matching")

    @server.tool()
    def normalize_skill(term: str) -> dict:
        """Resolve a raw skill/degree/certification string to its ESCO concept
        (or the legacy custom taxonomy) for debugging/inspection purposes."""
        result = normalize_to_esco(term, esco, normalizer, fuzzy_threshold=settings.matching_fuzzy_threshold)
        return {
            "raw": result.raw,
            "escoId": result.esco_id,
            "canonicalLabel": result.canonical_label,
            "matchedVia": result.matched_via,
        }

    return server
