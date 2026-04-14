from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EmergencyReserve(Base):
    """
    Singleton row (id=1) tracking the emergency fund target and current amount.

    target_months: How many months of expenses to keep in reserve (e.g. 3.0).
    target_cents: Pre-computed from target_months × avg_monthly_expenses.
    current_cents: Current balance of the emergency fund.
    account_id: Optional link to the account where the fund is held.
    """
    __tablename__ = "emergency_reserve"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    target_months: Mapped[float] = mapped_column(
        Numeric(5, 2), nullable=False, default=3.0
    )
    target_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    current_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    account_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
