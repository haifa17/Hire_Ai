from __future__ import annotations

import json
import re
from typing import Any, Dict


def parse_json_object(text: str) -> Dict[str, Any]:
    if not text:
        raise ValueError("Empty model output")

    candidate = text.strip()
    if candidate.startswith("```"):
        candidate = re.sub(r"^```(?:json)?\s*", "", candidate, flags=re.IGNORECASE)
        candidate = re.sub(r"\s*```$", "", candidate)

    try:
        parsed = json.loads(candidate)
        if isinstance(parsed, dict):
            return parsed
        raise ValueError("Model output is not a JSON object")
    except json.JSONDecodeError:
        start = candidate.find("{")
        end = candidate.rfind("}")
        if start >= 0 and end > start:
            parsed = json.loads(candidate[start : end + 1])
            if isinstance(parsed, dict):
                return parsed

    raise ValueError("Model output is not valid JSON")
