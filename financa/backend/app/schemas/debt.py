from datetime import date, datetime

from pydantic import BaseModel, Field


class DebtBase(BaseModel):
    name: str = Field(..., max_length=100)
    type: str = Field(default="other")
    principal_cents: int = Field(..., gt=0)
    current_balance_cents: int = Field(..., ge=0)
    interest_rate_monthly: float = Field(..., ge=0, le=1)
    start_date: date
    due_date: date | None = None
    monthly_payment_cents: int = Field(default=0, ge=0)
    status: str = Field(default="active")
    notes: str | None = None


class DebtCreate(DebtBase):
    id: str | None = None


class DebtUpdate(BaseModel):
    name: str | None = None
    current_balance_cents: int | None = Field(None, ge=0)
    interest_rate_monthly: float | None = Field(None, ge=0, le=1)
    due_date: date | None = None
    monthly_payment_cents: int | None = Field(None, ge=0)
    status: str | None = None
    notes: str | None = None


class DebtOut(DebtBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DebtPaymentCreate(BaseModel):
    debt_id: str
    amount_cents: int = Field(..., gt=0)
    date: date
    notes: str | None = None


class DebtPaymentOut(DebtPaymentCreate):
    id: str
    principal_cents: int
    interest_cents: int
    created_at: datetime

    model_config = {"from_attributes": True}
