"""
Recurrences router.

POST /recurrences/run-pending  — materialise all due recurrences (called by cron / lifespan scheduler).
GET  /recurrences/             — list all active recurrences.
POST /recurrences/             — create a new recurrence.
PATCH /recurrences/{id}        — update a recurrence.
DELETE /recurrences/{id}       — soft-delete.
"""
import json
import logging
import uuid
from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.recurrence import Recurrence
from app.models.transaction import Transaction
from app.schemas.recurrence import RecurrenceCreate, RecurrenceOut, RecurrenceUpdate

logger = logging.getLogger("financa.recurrences")

router = APIRouter(prefix="/recurrences", tags=["recurrences"])


def _advance_next_run(current: date, rrule: str) -> date:
    """
    Advance next_run by one period according to the RRULE.

    Supported: FREQ=DAILY, FREQ=WEEKLY, FREQ=MONTHLY, FREQ=YEARLY.
    Unknown rules default to +30 days.
    """
    freq = "MONTHLY"
    for part in rrule.upper().split(";"):
        if part.startswith("FREQ="):
            freq = part[5:]

    if freq == "DAILY":
        return current + timedelta(days=1)
    if freq == "WEEKLY":
        return current + timedelta(weeks=1)
    if freq == "YEARLY":
        try:
            return current.replace(year=current.year + 1)
        except ValueError:
            return current + timedelta(days=365)
    # MONTHLY default
    month = current.month + 1
    year = current.year
    if month > 12:
        month = 1
        year += 1
    # Clamp day to valid range for target month
    import calendar
    max_day = calendar.monthrange(year, month)[1]
    new_day = min(current.day, max_day)
    return date(year, month, new_day)


@router.post("/run-pending", status_code=status.HTTP_200_OK)
async def run_pending(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    """
    Materialise all recurrences with next_run <= today.
    Creates a transaction for each and advances next_run.
    Returns count of transactions created.
    """
    today = date.today()
    result = await db.execute(
        select(Recurrence).where(
            Recurrence.active.is_(True),
            Recurrence.deleted_at.is_(None),
            Recurrence.next_run <= today,
        )
    )
    due = result.scalars().all()

    created = 0
    for rec in due:
        try:
            template = json.loads(rec.template_json)
        except (json.JSONDecodeError, ValueError):
            logger.warning("Recurrence %s has invalid template_json, skipping", rec.id)
            continue

        # Build transaction from template
        txn_data = {
            "id": str(uuid.uuid4()),
            "account_id": template.get("account_id", ""),
            "category_id": template.get("category_id"),
            "amount_cents": template.get("amount_cents", 0),
            "type": template.get("type", "expense"),
            "description": template.get("description", rec.name),
            "date": today,
            "notes": f"Recorrência automática: {rec.name}",
            "source": "recurring",
        }

        if not txn_data["account_id"] or not txn_data["amount_cents"]:
            logger.warning("Recurrence %s has incomplete template, skipping", rec.id)
            continue

        txn = Transaction(**txn_data)
        db.add(txn)
        rec.next_run = _advance_next_run(rec.next_run, rec.rrule)
        created += 1

    logger.info("run_pending: created %d transactions from %d due recurrences", created, len(due))
    return {"created": created, "processed": len(due)}


@router.get("/", response_model=list[RecurrenceOut])
async def list_recurrences(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Recurrence]:
    result = await db.execute(
        select(Recurrence).where(Recurrence.deleted_at.is_(None)).order_by(Recurrence.next_run)
    )
    return list(result.scalars().all())


@router.post("/", response_model=RecurrenceOut, status_code=status.HTTP_201_CREATED)
async def create_recurrence(
    payload: RecurrenceCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Recurrence:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    rec = Recurrence(**data)
    db.add(rec)
    await db.flush()
    return rec


@router.patch("/{rec_id}", response_model=RecurrenceOut)
async def update_recurrence(
    rec_id: str,
    payload: RecurrenceUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Recurrence:
    rec = await db.get(Recurrence, rec_id)
    if not rec or rec.deleted_at:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(rec, field, value)
    return rec


@router.delete("/{rec_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_recurrence(
    rec_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    rec = await db.get(Recurrence, rec_id)
    if not rec or rec.deleted_at:
        raise HTTPException(status_code=404, detail="Recurrence not found")
    rec.deleted_at = datetime.now(timezone.utc)
