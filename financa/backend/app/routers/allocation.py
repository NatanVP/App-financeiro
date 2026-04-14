from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.allocation import Allocation
from app.schemas.allocation import AllocationOut, AllocationUpdate

router = APIRouter(prefix="/allocation", tags=["allocation"])


@router.get("/", response_model=AllocationOut)
async def get_allocation(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Allocation:
    result = await db.execute(select(Allocation).limit(1))
    allocation = result.scalars().first()
    if not allocation:
        # Return defaults without persisting
        allocation = Allocation(id=1)
    return allocation


@router.put("/", response_model=AllocationOut)
async def update_allocation(
    payload: AllocationUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Allocation:
    result = await db.execute(select(Allocation).limit(1))
    allocation = result.scalars().first()
    if not allocation:
        allocation = Allocation(id=1)
        db.add(allocation)

    allocation.reserve_pct = payload.reserve_pct
    allocation.debts_pct = payload.debts_pct
    allocation.goals_pct = payload.goals_pct
    await db.flush()
    return allocation
