"""Add recurrences, annual_provisions, emergency_reserve; add source to transactions; fix budgets to per-month

Revision ID: 0002
Revises: 0001
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── Fix 4: add source column to transactions ───────────────────────────────
    op.add_column(
        "transactions",
        sa.Column(
            "source",
            sa.String(20),
            nullable=False,
            server_default="app",
        ),
    )
    op.create_index("ix_transactions_source", "transactions", ["source"])

    # ── Fix 5: budgets per month ───────────────────────────────────────────────
    # Drop old unique constraint on category_id alone
    op.drop_constraint("uq_budget_category", "budgets", type_="unique")
    # Remove old period column, add year_month column
    op.drop_column("budgets", "period")
    op.add_column(
        "budgets",
        sa.Column("year_month", sa.String(7), nullable=False, server_default="2026-01"),
    )
    # New composite unique: (category_id, year_month)
    op.create_unique_constraint("uq_budget_category_month", "budgets", ["category_id", "year_month"])

    # ── Fix 2a: recurrences ────────────────────────────────────────────────────
    op.create_table(
        "recurrences",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("template_json", sa.Text, nullable=False),
        sa.Column("rrule", sa.String(200), nullable=False, server_default="FREQ=MONTHLY"),
        sa.Column("next_run", sa.Date, nullable=False, index=True),
        sa.Column("active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Fix 2b: annual_provisions ──────────────────────────────────────────────
    op.create_table(
        "annual_provisions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("annual_amount_cents", sa.BigInteger, nullable=False),
        sa.Column("due_month", sa.Integer, nullable=False),
        sa.Column("accumulated_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── Fix 2c: emergency_reserve (singleton) ─────────────────────────────────
    op.create_table(
        "emergency_reserve",
        sa.Column("id", sa.Integer, primary_key=True, server_default="1"),
        sa.Column("target_months", sa.Numeric(5, 2), nullable=False, server_default="3.0"),
        sa.Column("target_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("current_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("account_id", sa.String(36), nullable=True),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    # Seed singleton row
    op.execute("INSERT INTO emergency_reserve (id, target_months, target_cents, current_cents) VALUES (1, 3.0, 0, 0)")


def downgrade() -> None:
    op.drop_table("emergency_reserve")
    op.drop_table("annual_provisions")
    op.drop_table("recurrences")

    # Revert budgets
    op.drop_constraint("uq_budget_category_month", "budgets", type_="unique")
    op.drop_column("budgets", "year_month")
    op.add_column("budgets", sa.Column("period", sa.String(10), nullable=False, server_default="monthly"))
    op.create_unique_constraint("uq_budget_category", "budgets", ["category_id"])

    # Revert transactions
    op.drop_index("ix_transactions_source", "transactions")
    op.drop_column("transactions", "source")
