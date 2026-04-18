from datetime import datetime

from pydantic import BaseModel, Field


class AccountBase(BaseModel):
    name: str = Field(..., max_length=100)
    bank: str = Field(..., max_length=50)
    color: str = Field(default="#C0C1FF", pattern=r"^#[0-9A-Fa-f]{6}$")
    type: str = Field(default="checking")
    initial_balance_cents: int = Field(default=0, ge=0)


class AccountCreate(AccountBase):
    pass


class AccountUpdate(BaseModel):
    name: str | None = Field(None, max_length=100)
    bank: str | None = Field(None, max_length=50)
    color: str | None = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    type: str | None = None
    is_active: bool | None = None
    balance_cents: int | None = None


class AccountOut(AccountBase):
    id: str
    balance_cents: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    deleted_at: datetime | None = None

    model_config = {"from_attributes": True}
