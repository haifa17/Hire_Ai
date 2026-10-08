from __future__ import annotations

from typing import Any, Dict


def success_response(data: Dict[str, Any], message: str = "Success") -> Dict[str, Any]:
    return {
        "success": True,
        "message": message,
        "data": data,
    }
