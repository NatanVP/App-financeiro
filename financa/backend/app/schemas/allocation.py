from datetime import datetime

from pydantic import BaseModel, Field, model_validator


class AllocationUpdate(BaseModel):
    reserve_pct: int = Field(..., ge=0, le=100)
    debts_pct: int = Field(..., ge=0, le=100)
    goals_pct: int = Field(..., ge=0, le=100)

    @model_validator(mode="after")
    def must_sum_to_100(self) -> "AllocationUpdate":
        total = self.reserve_pct + self.debts_pct + self.goals_pct
        if total != 100:
            raise ValueError(f"Percentages must sum to 100, got {total}")
        return self


class AllocationOut(BaseModel):
    reserve_pct: int
    debts_pct: int
    goals_pct: int
    updated_at: datetime

    model_config = {"from_attributes": True}
