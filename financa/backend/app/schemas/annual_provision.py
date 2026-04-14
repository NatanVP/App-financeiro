from datetime import datetime

from pydantic import BaseModel, Field


class AnnualProvisionBase(BaseModel):
    name: str = Field(..., max_length=100)
    annual_amount_cents: int = Field(..., gt=0)
    due_month: int = Field(..., ge=1, le=12)
    accumulated_cents: int = Field(default=0, ge=0)


class AnnualProvisionCreate(AnnualProvisionBase):
    id: str | None = None


class AnnualProvisionUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    annual_amount_cents: int | None = Field(None, gt=0)
    due_month: int | None = Field(None, ge=1, le=12)
    accumulated_cents: int | None = Field(None, ge=0)


class AnnualProvisionOut(AnnualProvisionBase):
    id: str
    # Derived fields
    monthly_provision_cents: int = 0
    remaining_cents: int = 0
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
