from datetime import datetime

from sqlalchemy import DateTime, Numeric, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Allocation(Base):
    """Single-row table. Always upsert, never insert multiple rows."""

    __tablename__ = "allocation"

    id: Mapped[int] = mapped_column(primary_key=True, default=1)
    # percentages as integers summing to 100
    reserve_pct: Mapped[int] = mapped_column(nullable=False, default=50)
    debts_pct: Mapped[int] = mapped_column(nullable=False, default=20)
    goals_pct: Mapped[int] = mapped_column(nullable=False, default=30)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
