from datetime import datetime

from pydantic import BaseModel, Field


class EmergencyReserveUpdate(BaseModel):
    target_months: float | None = Field(None, gt=0)
    target_cents: int | None = Field(None, ge=0)
    current_cents: int | None = Field(None, ge=0)
    account_id: str | None = None


class EmergencyReserveOut(BaseModel):
    id: int
    target_months: float
    target_cents: int
    current_cents: int
    account_id: str | None = None
    progress_pct: float = 0.0
    remaining_cents: int = 0
    updated_at: datetime

    model_config = {"from_attributes": True}
