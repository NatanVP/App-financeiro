import uuid
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.bill import Bill
from app.schemas.bill import BillCreate, BillOut, BillUpdate

router = APIRouter(prefix="/bills", tags=["bills"])


@router.get("/", response_model=list[BillOut])
async def list_bills(
    status_filter: str | None = Query(None, alias="status"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Bill]:
    q = select(Bill).where(Bill.deleted_at.is_(None)).order_by(Bill.due_date)
    if status_filter:
        q = q.where(Bill.status == status_filter)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/", response_model=BillOut, status_code=status.HTTP_201_CREATED)
async def create_bill(
    payload: BillCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Bill:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    bill = Bill(**data)
    db.add(bill)
    await db.flush()
    return bill


@router.patch("/{bill_id}", response_model=BillOut)
async def update_bill(
    bill_id: str,
    payload: BillUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Bill:
    bill = await db.get(Bill, bill_id)
    if not bill or bill.deleted_at:
        raise HTTPException(status_code=404, detail="Bill not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(bill, field, value)
    return bill


@router.post("/{bill_id}/pay", response_model=BillOut)
async def mark_paid(
    bill_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Bill:
    """Mark bill as paid. If recurring, creates next occurrence."""
    bill = await db.get(Bill, bill_id)
    if not bill or bill.deleted_at:
        raise HTTPException(status_code=404, detail="Bill not found")

    bill.status = "paid"
    bill.paid_at = datetime.now(timezone.utc)

    if bill.is_recurring and bill.recurrence_day:
        next_due = _next_occurrence(bill.due_date, bill.recurrence_day)
        next_bill = Bill(
            id=str(uuid.uuid4()),
            name=bill.name,
            amount_cents=bill.amount_cents,
            category_id=bill.category_id,
            due_date=next_due,
            is_recurring=True,
            recurrence_day=bill.recurrence_day,
            status="pending",
            notes=bill.notes,
        )
        db.add(next_bill)

    await db.flush()
    return bill


@router.delete("/{bill_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_bill(
    bill_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    bill = await db.get(Bill, bill_id)
    if not bill or bill.deleted_at:
        raise HTTPException(status_code=404, detail="Bill not found")
    bill.deleted_at = datetime.now(timezone.utc)


def _next_occurrence(current_due: date, recurrence_day: int) -> date:
    """Compute next monthly occurrence on recurrence_day."""
    import calendar
    year, month = current_due.year, current_due.month
    if month == 12:
        year, month = year + 1, 1
    else:
        month += 1
    last_day = calendar.monthrange(year, month)[1]
    day = min(recurrence_day, last_day)
    return date(year, month, day)
