import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import require_token
from app.database import get_db
from app.models.goal import Goal, GoalContribution
from app.schemas.goal import (
    GoalContributionCreate,
    GoalContributionOut,
    GoalCreate,
    GoalOut,
    GoalUpdate,
)
from app.services.finance_engine import compute_goal_projection

router = APIRouter(prefix="/goals", tags=["goals"])


@router.get("/", response_model=list[GoalOut])
async def list_goals(
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> list[Goal]:
    result = await db.execute(
        select(Goal).where(Goal.deleted_at.is_(None)).order_by(Goal.target_date)
    )
    return list(result.scalars().all())


@router.post("/", response_model=GoalOut, status_code=status.HTTP_201_CREATED)
async def create_goal(
    payload: GoalCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Goal:
    data = payload.model_dump()
    if not data.get("id"):
        data["id"] = str(uuid.uuid4())
    goal = Goal(**data)
    db.add(goal)
    await db.flush()
    return goal


@router.get("/{goal_id}", response_model=GoalOut)
async def get_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Goal:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.deleted_at:
        raise HTTPException(status_code=404, detail="Goal not found")
    return goal


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> Goal:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.deleted_at:
        raise HTTPException(status_code=404, detail="Goal not found")
    for field, value in payload.model_dump(exclude_none=True).items():
        setattr(goal, field, value)
    return goal


@router.delete("/{goal_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_goal(
    goal_id: str,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> None:
    from datetime import datetime, timezone
    goal = await db.get(Goal, goal_id)
    if not goal or goal.deleted_at:
        raise HTTPException(status_code=404, detail="Goal not found")
    goal.deleted_at = datetime.now(timezone.utc)


@router.post("/{goal_id}/contributions", response_model=GoalContributionOut, status_code=status.HTTP_201_CREATED)
async def add_contribution(
    goal_id: str,
    payload: GoalContributionCreate,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> GoalContribution:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.deleted_at:
        raise HTTPException(status_code=404, detail="Goal not found")

    contribution = GoalContribution(
        id=str(uuid.uuid4()),
        goal_id=goal_id,
        amount_cents=payload.amount_cents,
        date=payload.date,
    )
    db.add(contribution)
    goal.current_cents += payload.amount_cents
    if goal.current_cents >= goal.target_cents:
        goal.status = "completed"
    await db.flush()
    return contribution


@router.get("/{goal_id}/projection")
async def project_goal(
    goal_id: str,
    monthly_contribution_cents: int,
    db: AsyncSession = Depends(get_db),
    _: str = Depends(require_token),
) -> dict:
    goal = await db.get(Goal, goal_id)
    if not goal or goal.deleted_at:
        raise HTTPException(status_code=404, detail="Goal not found")

    projection = compute_goal_projection(
        target_cents=goal.target_cents,
        current_cents=goal.current_cents,
        monthly_contribution_cents=monthly_contribution_cents,
    )
    return {
        "months_needed": projection.months_needed,
        "monthly_needed_cents": projection.monthly_needed_cents,
        "already_reached": projection.already_reached,
        "remaining_cents": max(0, goal.target_cents - goal.current_cents),
    }
