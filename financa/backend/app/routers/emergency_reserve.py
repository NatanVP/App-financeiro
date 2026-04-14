"""
Emergency reserve — singleton GET/PUT.
Row id=1 always exists (seeded in migration).
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.emergency_reserve import EmergencyReserve
from app.schemas.emergency_reserve import EmergencyReserveOut, EmergencyReserveUpdate

router = APIRouter(prefix="/emergency-reserve", tags=["emergency_reserve"])


def _enrich(r: EmergencyReserve) -> dict:
    progress_pct = (r.current_cents / r.target_cents * 100) if r.target_cents > 0 else 0.0
    remaining = max(0, r.target_cents - r.current_cents)
    return {"progress_pct": round(progress_pct, 1), "remaining_cents": remaining}


@router.get("/", response_model=EmergencyReserveOut)
async def get_reserve(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    r = await db.get(EmergencyReserve, 1)
    if not r:
        raise HTTPException(status_code=404, detail="Emergency reserve not initialised")
    d = {col.name: getattr(r, col.name) for col in r.__table__.columns}
    d.update(_enrich(r))
    return d


@router.put("/", response_model=EmergencyReserveOut)
async def update_reserve(
    payload: EmergencyReserveUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    r = await db.get(EmergencyReserve, 1)
    if not r:
        raise HTTPException(status_code=404, detail="Emergency reserve not initialised")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(r, field, value)
    d = {col.name: getattr(r, col.name) for col in r.__table__.columns}
    d.update(_enrich(r))
    return d
