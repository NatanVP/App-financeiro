from datetime import date, datetime

from pydantic import BaseModel, Field, model_validator


class TransactionBase(BaseModel):
    account_id: str
    category_id: str | None = None
    # amount in cents, always positive
    amount_cents: int = Field(..., gt=0)
    # type: expense | income | transfer
    type: str
    description: str = Field(default="", max_length=200)
    date: date
    notes: str | None = None
    transfer_to_account_id: str | None = None
    device_id: str | None = None
    # source tracks the origin of each transaction
    source: str = "app"

    @model_validator(mode="after")
    def check_transfer(self) -> "TransactionBase":
        if self.type == "transfer" and self.transfer_to_account_id is None:
            raise ValueError("transfer_to_account_id required for transfer type")
        return self


class TransactionCreate(TransactionBase):
    # id can be provided by client for offline-first sync
    id: str | None = None


class TransactionUpdate(BaseModel):
    category_id: str | None = None
    amount_cents: int | None = Field(None, gt=0)
    type: str | None = None
    description: str | None = Field(None, max_length=200)
    date: date | None = None
    notes: str | None = None
    is_reconciled: bool | None = None
    source: str | None = None


class TransactionOut(TransactionBase):
    id: str
    is_reconciled: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}
