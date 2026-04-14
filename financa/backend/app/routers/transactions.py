import uuid
from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.account import Account
from app.models.transaction import Transaction
from app.schemas.transaction import TransactionCreate, TransactionOut, TransactionUpdate

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("/", response_model=list[TransactionOut])
async def list_transactions(
    account_id: str | None = Query(None),
    category_id: str | None = Query(None),
    type: str | None = Query(None),
    source: str | None = Query(None),
    date_from: date | None = Query(None),
    date_to: date | None = Query(None),
    limit: int = Query(100, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Transaction]:
    q = select(Transaction).where(Transaction.deleted_at.is_(None))
    if account_id:
        q = q.where(Transaction.account_id == account_id)
    if category_id:
        q = q.where(Transaction.category_id == category_id)
    if type:
        q = q.where(Transaction.type == type)
    if source:
        q = q.where(Transaction.source == source)
    if date_from:
        q = q.where(Transaction.date >= date_from)
    if date_to:
        q = q.where(Transaction.date <= date_to)
    q = q.order_by(Transaction.date.desc()).limit(limit).offset(offset)
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/", response_model=TransactionOut, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Transaction:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())

    # Verify account exists
    account = await db.get(Account, data["account_id"])
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Account not found")

    txn = Transaction(**data)
    db.add(txn)
    await db.flush()

    # Update account balance
    if data["type"] == "income":
        account.balance_cents += data["amount_cents"]
    elif data["type"] == "expense":
        account.balance_cents -= data["amount_cents"]
    elif data["type"] == "transfer" and data.get("transfer_to_account_id"):
        account.balance_cents -= data["amount_cents"]
        dest = await db.get(Account, data["transfer_to_account_id"])
        if dest and not dest.deleted_at:
            dest.balance_cents += data["amount_cents"]

    return txn


@router.get("/{txn_id}", response_model=TransactionOut)
async def get_transaction(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Transaction:
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.deleted_at:
        raise HTTPException(status_code=404, detail="Transaction not found")
    return txn


@router.patch("/{txn_id}", response_model=TransactionOut)
async def update_transaction(
    txn_id: str,
    payload: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Transaction:
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.deleted_at:
        raise HTTPException(status_code=404, detail="Transaction not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(txn, field, value)
    return txn


@router.delete("/{txn_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_transaction(
    txn_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    txn = await db.get(Transaction, txn_id)
    if not txn or txn.deleted_at:
        raise HTTPException(status_code=404, detail="Transaction not found")
    # Reverse balance effect
    account = await db.get(Account, txn.account_id)
    if account and not account.deleted_at:
        if txn.type == "income":
            account.balance_cents -= txn.amount_cents
        elif txn.type == "expense":
            account.balance_cents += txn.amount_cents
    txn.deleted_at = datetime.now(timezone.utc)
