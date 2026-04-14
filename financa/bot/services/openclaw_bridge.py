"""
OpenClaw integration bridge.

If OPENCLAW_API_URL is set, forwards natural language queries to the
existing OpenClaw agent on the VPS and returns the response.
If not configured, returns None so callers can handle gracefully.
"""
import os
from typing import Any

import httpx

_URL = os.environ.get("OPENCLAW_API_URL", "").rstrip("/")
_KEY = os.environ.get("OPENCLAW_API_KEY", "")


async def ask(prompt: str, context: dict | None = None) -> str | None:
    """
    Send a prompt to OpenClaw and return the response text.

    Returns None if OpenClaw is not configured or request fails.
    """
    if not _URL:
        return None

    payload: dict[str, Any] = {"prompt": prompt}
    if context:
        payload["context"] = context

    headers: dict[str, str] = {}
    if _KEY:
        headers["Authorization"] = f"Bearer {_KEY}"

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            r = await client.post(f"{_URL}/chat", json=payload, headers=headers)
            r.raise_for_status()
            data = r.json()
            # OpenClaw may return { "response": "...", "text": "...", "content": "..." }
            return (
                data.get("response")
                or data.get("text")
                or data.get("content")
                or str(data)
            )
    except Exception:
        return None
