from datetime import date, datetime

from pydantic import BaseModel, Field


class RecurrenceBase(BaseModel):
    name: str = Field(..., max_length=200)
    template_json: str  # JSON string
    rrule: str = Field(default="FREQ=MONTHLY", max_length=200)
    next_run: date
    active: bool = True


class RecurrenceCreate(RecurrenceBase):
    id: str | None = None


class RecurrenceUpdate(BaseModel):
    name: str | None = Field(None, max_length=200)
    template_json: str | None = None
    rrule: str | None = None
    next_run: date | None = None
    active: bool | None = None


class RecurrenceOut(RecurrenceBase):
    id: str
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}
