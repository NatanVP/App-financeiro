import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, Numeric, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Debt(Base):
    __tablename__ = "debts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    # type: credit_card | personal_loan | vehicle | mortgage | store | other
    type: Mapped[str] = mapped_column(String(30), nullable=False, default="other")
    # original principal in cents
    principal_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # current outstanding balance in cents (updated on each payment)
    current_balance_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # monthly interest rate as decimal, e.g. 0.145 for 14.5% a.m.
    interest_rate_monthly: Mapped[float] = mapped_column(Numeric(10, 6), nullable=False, default=0)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    # agreed monthly payment in cents
    monthly_payment_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    # status: active | paid_off | paused
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="active")
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class DebtPayment(Base):
    __tablename__ = "debt_payments"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    debt_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # portion that went to principal (the rest is interest)
    principal_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    interest_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    date: Mapped[date] = mapped_column(Date, nullable=False)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
