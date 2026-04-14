import uuid
from datetime import datetime

from sqlalchemy import DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Category(Base):
    __tablename__ = "categories"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(80), nullable=False)
    # Material Symbols icon name, e.g. "shopping_cart"
    icon: Mapped[str] = mapped_column(String(50), nullable=False, default="label")
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#C0C1FF")
    # type: expense | income | transfer
    type: Mapped[str] = mapped_column(String(10), nullable=False, default="expense")
    # optional parent for sub-categories
    parent_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # system categories cannot be deleted
    is_system: Mapped[bool] = mapped_column(nullable=False, default=False)
    sort_order: Mapped[int] = mapped_column(nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
