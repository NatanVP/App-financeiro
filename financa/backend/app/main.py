import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import (
    accounts,
    agent_log,
    allocation,
    bills,
    budgets,
    categories,
    dashboard,
    debts,
    goals,
    import_parser,
    sync,
    transactions,
)
from app.routers import (
    annual_provisions,
    emergency_reserve,
    recurrences,
)

logger = logging.getLogger("financa.main")

_scheduler = AsyncIOScheduler(timezone="America/Sao_Paulo")


async def _run_pending_recurrences() -> None:
    """Daily job: materialise due recurrences via internal API call."""
    import os
    import httpx

    base = os.environ.get("INTERNAL_API_URL", "http://localhost:8000")
    token = os.environ.get("API_TOKEN", "")
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                f"{base}/recurrences/run-pending",
                headers={"Authorization": f"Bearer {token}"},
            )
            data = resp.json()
            logger.info("Recurrence job: %s", data)
    except Exception as exc:
        logger.error("Recurrence job failed: %s", exc)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    # Run recurrences daily at 06:00 Brasília time
    _scheduler.add_job(
        _run_pending_recurrences,
        "cron",
        hour=6,
        minute=0,
        id="daily_recurrences",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("APScheduler started")
    yield
    _scheduler.shutdown(wait=False)
    logger.info("APScheduler stopped")


app = FastAPI(
    title="Finança API",
    version="1.1.0",
    description="Personal finance app backend",
    docs_url="/docs",
    redoc_url=None,
    lifespan=lifespan,
)

# Allow mobile app (Expo dev server + prod) and bot on same VPS; protected by Bearer token
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(accounts.router)
app.include_router(agent_log.router)
app.include_router(categories.router)
app.include_router(transactions.router)
app.include_router(debts.router)
app.include_router(goals.router)
app.include_router(budgets.router)
app.include_router(bills.router)
app.include_router(allocation.router)
app.include_router(sync.router)
app.include_router(dashboard.router)
app.include_router(import_parser.router)
app.include_router(recurrences.router)
app.include_router(annual_provisions.router)
app.include_router(emergency_reserve.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}
