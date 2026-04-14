"""HTTP client for the Finança backend API."""
import os
from typing import Any

import httpx

_BASE_URL = os.environ["API_BASE_URL"].rstrip("/")
_TOKEN = os.environ["API_TOKEN"]

_HEADERS = {"Authorization": f"Bearer {_TOKEN}", "Content-Type": "application/json"}


async def _get(path: str, params: dict | None = None) -> Any:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.get(f"{_BASE_URL}{path}", headers=_HEADERS, params=params)
        r.raise_for_status()
        return r.json()


async def _post(path: str, json: dict) -> Any:
    async with httpx.AsyncClient(timeout=10.0) as client:
        r = await client.post(f"{_BASE_URL}{path}", headers=_HEADERS, json=json)
        r.raise_for_status()
        return r.json()


async def get_monthly_summary(year: int, month: int) -> dict:
    return await _get("/dashboard/summary", params={"year": year, "month": month})


async def list_transactions(limit: int = 10) -> list[dict]:
    return await _get("/transactions/", params={"limit": limit})


async def create_transaction(
    account_id: str,
    amount_cents: int,
    tx_type: str,
    description: str,
    date_str: str,
    category_id: str | None = None,
    source: str = "telegram",
) -> dict:
    return await _post("/transactions/", {
        "account_id": account_id,
        "amount_cents": amount_cents,
        "type": tx_type,
        "description": description,
        "date": date_str,
        "category_id": category_id,
        "source": source,
    })


async def list_debts() -> list[dict]:
    return await _get("/debts/")


async def list_goals() -> list[dict]:
    return await _get("/goals/")


async def list_accounts() -> list[dict]:
    return await _get("/accounts/")


async def log_agent_action(
    chat_id: str, command: str, input_text: str | None, response_text: str | None
) -> None:
    """Log bot interaction to agent_log table via API."""
    # We can't easily call agent_log directly — it's not exposed as its own endpoint.
    # Log via a private internal endpoint or simply skip if unavailable.
    try:
        await _post("/agent-log/", {
            "chat_id": chat_id,
            "command": command,
            "input_text": input_text,
            "response_text": response_text,
        })
    except Exception:
        pass  # Logging failure must not crash the bot
