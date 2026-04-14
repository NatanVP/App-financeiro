import math
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.annual_provision import AnnualProvision
from app.schemas.annual_provision import (
    AnnualProvisionCreate,
    AnnualProvisionOut,
    AnnualProvisionUpdate,
)

router = APIRouter(prefix="/annual-provisions", tags=["annual_provisions"])


def _enrich(p: AnnualProvision) -> dict:
    monthly = math.ceil(p.annual_amount_cents / 12)
    remaining = max(0, p.annual_amount_cents - p.accumulated_cents)
    return {
        "monthly_provision_cents": monthly,
        "remaining_cents": remaining,
    }


@router.get("/", response_model=list[AnnualProvisionOut])
async def list_provisions(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[dict]:
    result = await db.execute(
        select(AnnualProvision).where(AnnualProvision.deleted_at.is_(None)).order_by(AnnualProvision.due_month)
    )
    items = result.scalars().all()
    out = []
    for p in items:
        d = {col.name: getattr(p, col.name) for col in p.__table__.columns}
        d.update(_enrich(p))
        out.append(d)
    return out


@router.post("/", response_model=AnnualProvisionOut, status_code=status.HTTP_201_CREATED)
async def create_provision(
    payload: AnnualProvisionCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    p = AnnualProvision(**data)
    db.add(p)
    await db.flush()
    d = {col.name: getattr(p, col.name) for col in p.__table__.columns}
    d.update(_enrich(p))
    return d


@router.patch("/{prov_id}", response_model=AnnualProvisionOut)
async def update_provision(
    prov_id: str,
    payload: AnnualProvisionUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    p = await db.get(AnnualProvision, prov_id)
    if not p or p.deleted_at:
        raise HTTPException(status_code=404, detail="Provision not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(p, field, value)
    d = {col.name: getattr(p, col.name) for col in p.__table__.columns}
    d.update(_enrich(p))
    return d


@router.delete("/{prov_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_provision(
    prov_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    p = await db.get(AnnualProvision, prov_id)
    if not p or p.deleted_at:
        raise HTTPException(status_code=404, detail="Provision not found")
    p.deleted_at = datetime.now(timezone.utc)
