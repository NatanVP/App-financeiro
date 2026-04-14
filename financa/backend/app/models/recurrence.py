import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Recurrence(Base):
    """
    Template for a recurring transaction.

    template_json: JSON dict with the transaction fields to copy.
    rrule: iCal RRULE string (e.g. "FREQ=MONTHLY;BYDAY=5").
           For simple monthly use: "FREQ=MONTHLY".
    next_run: Date when the next transaction should be created.
    active: False = paused (history preserved).
    """
    __tablename__ = "recurrences"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # JSON serialised transaction template (account_id, category_id, amount_cents, type, etc.)
    template_json: Mapped[str] = mapped_column(Text, nullable=False)
    # iCal RRULE — simple form: "FREQ=MONTHLY" / "FREQ=WEEKLY" / "FREQ=YEARLY"
    rrule: Mapped[str] = mapped_column(String(200), nullable=False, default="FREQ=MONTHLY")
    next_run: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
