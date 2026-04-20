from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.account import Account
from app.schemas.account import AccountCreate, AccountOut, AccountUpdate

router = APIRouter(prefix="/accounts", tags=["accounts"])


@router.get("/", response_model=list[AccountOut])
async def list_accounts(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Account]:
    result = await db.execute(
        select(Account).where(Account.deleted_at.is_(None)).order_by(Account.name)
    )
    return list(result.scalars().all())


@router.post("/", response_model=AccountOut, status_code=status.HTTP_201_CREATED)
async def create_account(
    payload: AccountCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Account:
    account = Account(
        **payload.model_dump(),
        balance_cents=payload.initial_balance_cents,
    )
    db.add(account)
    await db.flush()
    return account


@router.get("/{account_id}", response_model=AccountOut)
async def get_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Account:
    account = await db.get(Account, account_id)
    if not account or account.deleted_at:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


@router.patch("/{account_id}", response_model=AccountOut)
async def update_account(
    account_id: str,
    payload: AccountUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Account:
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    # Allow patching soft-deleted accounts (e.g. to set is_active=false)
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(account, field, value)
    return account


@router.delete("/{account_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    account_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    account = await db.get(Account, account_id)
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    if not account.deleted_at:
        account.deleted_at = datetime.now(timezone.utc)
    # Always deactivate — ensures mobile filters it even if deleted_at is not serialized
    account.is_active = False
