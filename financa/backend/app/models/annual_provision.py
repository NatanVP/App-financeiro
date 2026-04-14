import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class AnnualProvision(Base):
    """
    Annual expense provisioned across 12 months (e.g. IPVA, IPTU, insurance).

    annual_amount: Full annual cost in cents.
    due_month: 1-12, the month the bill is typically due.
    accumulated_cents: How much has been set aside so far this cycle.
    Monthly provision = annual_amount / 12 (debited from surplus automatically).
    """
    __tablename__ = "annual_provisions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    annual_amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    due_month: Mapped[int] = mapped_column(Integer, nullable=False)  # 1–12
    accumulated_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
