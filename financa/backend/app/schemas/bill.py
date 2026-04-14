from datetime import date, datetime

from pydantic import BaseModel, Field


class BillBase(BaseModel):
    name: str = Field(..., max_length=100)
    amount_cents: int = Field(..., gt=0)
    category_id: str | None = None
    due_date: date
    is_recurring: bool = True
    recurrence_day: int | None = Field(None, ge=1, le=31)
    status: str = Field(default="pending")
    notes: str | None = None


class BillCreate(BillBase):
    id: str | None = None


class BillUpdate(BaseModel):
    name: str | None = None
    amount_cents: int | None = Field(None, gt=0)
    due_date: date | None = None
    status: str | None = None
    notes: str | None = None


class BillOut(BillBase):
    id: str
    paid_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
