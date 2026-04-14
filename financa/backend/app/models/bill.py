import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Bill(Base):
    __tablename__ = "bills"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    category_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    # due_date for this specific occurrence
    due_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    # is_recurring: generates next occurrence when marked paid
    is_recurring: Mapped[bool] = mapped_column(nullable=False, default=True)
    # day of month for recurrence (1-31)
    recurrence_day: Mapped[int | None] = mapped_column(nullable=True)
    # status: pending | paid | overdue | scheduled | cancelled
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="pending")
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
