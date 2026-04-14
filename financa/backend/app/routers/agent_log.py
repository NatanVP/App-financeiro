from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.agent_log import AgentLog

router = APIRouter(prefix="/agent-log", tags=["agent-log"])


class AgentLogCreate(BaseModel):
    chat_id: str
    command: str
    input_text: str | None = None
    response_text: str | None = None
    payload: str | None = None


@router.post("/", status_code=201)
async def create_log(
    payload: AgentLogCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    log = AgentLog(**payload.model_dump())
    db.add(log)
    await db.flush()
    return {"id": log.id}
