import uuid
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    bank: Mapped[str] = mapped_column(String(50), nullable=False)
    # color as hex string, e.g. "#820AD1"
    color: Mapped[str] = mapped_column(String(7), nullable=False, default="#C0C1FF")
    # type: checking | savings | credit | investment | cash
    type: Mapped[str] = mapped_column(String(20), nullable=False, default="checking")
    # balance in cents — updated via triggers/reconciliation
    balance_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    # initial balance in cents at account creation
    initial_balance_cents: Mapped[int] = mapped_column(BigInteger, nullable=False, default=0)
    is_active: Mapped[bool] = mapped_column(nullable=False, default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
