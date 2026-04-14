from datetime import datetime

from pydantic import BaseModel, Field


class CategoryBase(BaseModel):
    name: str = Field(..., max_length=80)
    icon: str = Field(default="label", max_length=50)
    color: str = Field(default="#C0C1FF", pattern=r"^#[0-9A-Fa-f]{6}$")
    type: str = Field(default="expense")
    parent_id: str | None = None
    sort_order: int = Field(default=0)


class CategoryCreate(CategoryBase):
    pass


class CategoryUpdate(BaseModel):
    name: str | None = Field(None, max_length=80)
    icon: str | None = None
    color: str | None = None
    sort_order: int | None = None


class CategoryOut(CategoryBase):
    id: str
    is_system: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
