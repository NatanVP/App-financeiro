"""
Offline-first sync service.

Strategy: last-write-wins by updated_at.
- Pull: returns all rows updated after since_ts.
- Push: upserts client rows; server keeps row if server.updated_at > client.updated_at.
"""
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import (
    Account,
    Allocation,
    Bill,
    Budget,
    Category,
    Debt,
    DebtPayment,
    Goal,
    GoalContribution,
    Transaction,
)
from app.schemas.sync import SyncPullResponse, SyncPushRequest, SyncPushResponse


async def pull(since_ts: datetime, db: AsyncSession) -> SyncPullResponse:
    """Return all rows updated after since_ts."""

    async def fetch(model: type, /) -> list:  # type: ignore[type-arg]
        result = await db.execute(
            select(model).where(model.updated_at > since_ts)  # type: ignore[attr-defined]
        )
        return list(result.scalars().all())

    allocations = await db.execute(select(Allocation).limit(1))
    allocation = allocations.scalars().first()

    return SyncPullResponse(
        since_ts=since_ts,
        transactions=await fetch(Transaction),
        debts=await fetch(Debt),
        debt_payments=await fetch(DebtPayment),
        goals=await fetch(Goal),
        goal_contributions=await fetch(GoalContribution),
        budgets=await fetch(Budget),
        bills=await fetch(Bill),
        accounts=await fetch(Account),
        categories=await fetch(Category),
        allocation=allocation,
    )


async def push(request: SyncPushRequest, db: AsyncSession) -> SyncPushResponse:
    """Upsert client rows using last-write-wins on updated_at."""
    accepted = 0
    conflicts = 0

    async def _upsert(model: type, rows: list) -> None:  # type: ignore[type-arg]
        nonlocal accepted, conflicts
        for row in rows:
            data = row.model_dump()
            # Fetch existing to compare updated_at
            existing = await db.get(model, data["id"])
            if existing is not None:
                server_ts: datetime = existing.updated_at  # type: ignore[attr-defined]
                client_ts: datetime = data["updated_at"]
                if server_ts > client_ts:
                    # Server is newer — skip
                    conflicts += 1
                    continue
            # Upsert
            stmt = pg_insert(model.__table__).values(**data)  # type: ignore[attr-defined]
            stmt = stmt.on_conflict_do_update(
                index_elements=["id"],
                set_={k: v for k, v in data.items() if k != "id"},
            )
            await db.execute(stmt)
            accepted += 1

    await _upsert(Transaction, request.transactions)
    await _upsert(Debt, request.debts)
    await _upsert(DebtPayment, request.debt_payments)
    await _upsert(Goal, request.goals)
    await _upsert(GoalContribution, request.goal_contributions)
    await _upsert(Budget, request.budgets)
    await _upsert(Bill, request.bills)
    await _upsert(Account, request.accounts)

    return SyncPushResponse(accepted=accepted, conflicts=conflicts)
