from datetime import datetime

from pydantic import BaseModel, Field


class BudgetBase(BaseModel):
    category_id: str
    year_month: str = Field(..., pattern=r"^\d{4}-\d{2}$", description="YYYY-MM")
    amount_cents: int = Field(..., gt=0)


class BudgetCreate(BudgetBase):
    id: str | None = None


class BudgetUpdate(BaseModel):
    amount_cents: int | None = Field(None, gt=0)


class BudgetOut(BudgetBase):
    id: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
