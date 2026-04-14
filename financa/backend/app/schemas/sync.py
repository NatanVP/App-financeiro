"""Sync schema for offline-first last-write-wins strategy."""
from datetime import datetime

from pydantic import BaseModel

from app.schemas.account import AccountOut
from app.schemas.allocation import AllocationOut
from app.schemas.bill import BillOut
from app.schemas.budget import BudgetOut
from app.schemas.category import CategoryOut
from app.schemas.debt import DebtOut, DebtPaymentOut
from app.schemas.goal import GoalContributionOut, GoalOut
from app.schemas.transaction import TransactionOut


class SyncPushRequest(BaseModel):
    """Client sends all rows modified since last sync."""

    transactions: list[TransactionOut] = []
    debts: list[DebtOut] = []
    debt_payments: list[DebtPaymentOut] = []
    goals: list[GoalOut] = []
    goal_contributions: list[GoalContributionOut] = []
    budgets: list[BudgetOut] = []
    bills: list[BillOut] = []
    accounts: list[AccountOut] = []


class SyncPushResponse(BaseModel):
    accepted: int
    conflicts: int  # rows where server updated_at > client updated_at (server wins)


class SyncPullResponse(BaseModel):
    """Server sends all rows modified after since_ts."""

    since_ts: datetime
    transactions: list[TransactionOut] = []
    debts: list[DebtOut] = []
    debt_payments: list[DebtPaymentOut] = []
    goals: list[GoalOut] = []
    goal_contributions: list[GoalContributionOut] = []
    budgets: list[BudgetOut] = []
    bills: list[BillOut] = []
    accounts: list[AccountOut] = []
    categories: list[CategoryOut] = []
    allocation: AllocationOut | None = None
