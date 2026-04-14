from datetime import date, datetime

from pydantic import BaseModel, Field


class GoalBase(BaseModel):
    name: str = Field(..., max_length=100)
    target_cents: int = Field(..., gt=0)
    target_date: date | None = None
    icon: str = Field(default="track_changes", max_length=50)
    color: str = Field(default="#C0C1FF", pattern=r"^#[0-9A-Fa-f]{6}$")
    status: str = Field(default="active")


class GoalCreate(GoalBase):
    id: str | None = None


class GoalUpdate(BaseModel):
    name: str | None = None
    target_cents: int | None = Field(None, gt=0)
    target_date: date | None = None
    icon: str | None = None
    color: str | None = None
    status: str | None = None


class GoalOut(GoalBase):
    id: str
    current_cents: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class GoalContributionCreate(BaseModel):
    goal_id: str
    amount_cents: int = Field(..., gt=0)
    date: date


class GoalContributionOut(GoalContributionCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}
