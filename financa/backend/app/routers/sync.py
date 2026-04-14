from datetime import datetime

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.schemas.sync import SyncPullResponse, SyncPushRequest, SyncPushResponse
from app.services import sync_service

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/pull", response_model=SyncPullResponse)
async def pull(
    since: datetime = Query(..., description="ISO 8601 timestamp; pull rows updated after this"),
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> SyncPullResponse:
    return await sync_service.pull(since_ts=since, db=db)


@router.post("/push", response_model=SyncPushResponse)
async def push(
    payload: SyncPushRequest,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> SyncPushResponse:
    return await sync_service.push(request=payload, db=db)
