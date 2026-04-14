import uuid
from datetime import date, datetime

from sqlalchemy import BigInteger, Date, DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Transaction(Base):
    __tablename__ = "transactions"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    account_id: Mapped[str] = mapped_column(String(36), nullable=False, index=True)
    category_id: Mapped[str | None] = mapped_column(String(36), nullable=True, index=True)
    # amount in cents — always positive; direction determined by type
    amount_cents: Mapped[int] = mapped_column(BigInteger, nullable=False)
    # type: expense | income | transfer
    type: Mapped[str] = mapped_column(String(10), nullable=False)
    description: Mapped[str] = mapped_column(String(200), nullable=False, default="")
    date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    # for transfers: the destination account id
    transfer_to_account_id: Mapped[str | None] = mapped_column(String(36), nullable=True)
    is_reconciled: Mapped[bool] = mapped_column(nullable=False, default=False)
    # device_id for sync conflict resolution
    device_id: Mapped[str | None] = mapped_column(String(100), nullable=True)
    # source: app | telegram | agent | import | recurring
    source: Mapped[str] = mapped_column(String(20), nullable=False, default="app")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
