"""Initial schema + seed data

Revision ID: 0001
Revises:
Create Date: 2026-04-13
"""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # ── accounts ──────────────────────────────────────────────────────────────
    op.create_table(
        "accounts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("bank", sa.String(50), nullable=False),
        sa.Column("color", sa.String(7), nullable=False, server_default="#C0C1FF"),
        sa.Column("type", sa.String(20), nullable=False, server_default="checking"),
        sa.Column("balance_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("initial_balance_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── categories ────────────────────────────────────────────────────────────
    op.create_table(
        "categories",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(80), nullable=False),
        sa.Column("icon", sa.String(50), nullable=False, server_default="label"),
        sa.Column("color", sa.String(7), nullable=False, server_default="#C0C1FF"),
        sa.Column("type", sa.String(10), nullable=False, server_default="expense"),
        sa.Column("parent_id", sa.String(36), nullable=True),
        sa.Column("is_system", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── transactions ──────────────────────────────────────────────────────────
    op.create_table(
        "transactions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("account_id", sa.String(36), nullable=False, index=True),
        sa.Column("category_id", sa.String(36), nullable=True, index=True),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("type", sa.String(10), nullable=False),
        sa.Column("description", sa.String(200), nullable=False, server_default=""),
        sa.Column("date", sa.Date, nullable=False, index=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("transfer_to_account_id", sa.String(36), nullable=True),
        sa.Column("is_reconciled", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("device_id", sa.String(100), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── debts ─────────────────────────────────────────────────────────────────
    op.create_table(
        "debts",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.String(30), nullable=False, server_default="other"),
        sa.Column("principal_cents", sa.BigInteger, nullable=False),
        sa.Column("current_balance_cents", sa.BigInteger, nullable=False),
        sa.Column("interest_rate_monthly", sa.Numeric(10, 6), nullable=False, server_default="0"),
        sa.Column("start_date", sa.Date, nullable=False),
        sa.Column("due_date", sa.Date, nullable=True),
        sa.Column("monthly_payment_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── debt_payments ─────────────────────────────────────────────────────────
    op.create_table(
        "debt_payments",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("debt_id", sa.String(36), nullable=False, index=True),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("principal_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("interest_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── goals ─────────────────────────────────────────────────────────────────
    op.create_table(
        "goals",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("target_cents", sa.BigInteger, nullable=False),
        sa.Column("current_cents", sa.BigInteger, nullable=False, server_default="0"),
        sa.Column("target_date", sa.Date, nullable=True),
        sa.Column("icon", sa.String(50), nullable=False, server_default="track_changes"),
        sa.Column("color", sa.String(7), nullable=False, server_default="#C0C1FF"),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── goal_contributions ────────────────────────────────────────────────────
    op.create_table(
        "goal_contributions",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("goal_id", sa.String(36), nullable=False, index=True),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── budgets ───────────────────────────────────────────────────────────────
    op.create_table(
        "budgets",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("category_id", sa.String(36), nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("period", sa.String(10), nullable=False, server_default="monthly"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("category_id", name="uq_budget_category"),
    )

    # ── bills ─────────────────────────────────────────────────────────────────
    op.create_table(
        "bills",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("amount_cents", sa.BigInteger, nullable=False),
        sa.Column("category_id", sa.String(36), nullable=True),
        sa.Column("due_date", sa.Date, nullable=False, index=True),
        sa.Column("is_recurring", sa.Boolean, nullable=False, server_default="true"),
        sa.Column("recurrence_day", sa.Integer, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("notes", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.Column("deleted_at", sa.DateTime(timezone=True), nullable=True),
    )

    # ── allocation ────────────────────────────────────────────────────────────
    op.create_table(
        "allocation",
        sa.Column("id", sa.Integer, primary_key=True, server_default="1"),
        sa.Column("reserve_pct", sa.Integer, nullable=False, server_default="50"),
        sa.Column("debts_pct", sa.Integer, nullable=False, server_default="20"),
        sa.Column("goals_pct", sa.Integer, nullable=False, server_default="30"),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
    )

    # ── agent_log ─────────────────────────────────────────────────────────────
    op.create_table(
        "agent_log",
        sa.Column("id", sa.BigInteger, primary_key=True, autoincrement=True),
        sa.Column("chat_id", sa.String(50), nullable=False, index=True),
        sa.Column("command", sa.String(100), nullable=False),
        sa.Column("input_text", sa.Text, nullable=True),
        sa.Column("response_text", sa.Text, nullable=True),
        sa.Column("payload", sa.Text, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # ─── Seed default allocation ───────────────────────────────────────────────
    op.execute("INSERT INTO allocation (id, reserve_pct, debts_pct, goals_pct) VALUES (1, 50, 20, 30)")

    # ─── Seed Brazilian categories ─────────────────────────────────────────────
    _seed_categories()


def _seed_categories() -> None:
    import uuid
    from datetime import datetime

    now = datetime.utcnow().isoformat()

    expense_categories = [
        # (name, icon, color, sort_order)
        ("Moradia",       "home",               "#C0C1FF", 1),
        ("Alimentação",   "restaurant",         "#C0C1FF", 2),
        ("Transporte",    "directions_car",     "#C0C1FF", 3),
        ("Saúde",         "medical_services",   "#C0C1FF", 4),
        ("Educação",      "school",             "#C0C1FF", 5),
        ("Lazer",         "movie",              "#C0C1FF", 6),
        ("Vestuário",     "checkroom",          "#C0C1FF", 7),
        ("Supermercado",  "shopping_cart",      "#C0C1FF", 8),
        ("Gasolina",      "local_gas_station",  "#C0C1FF", 9),
        ("Serviços",      "handyman",           "#C0C1FF", 10),
        ("Impostos",      "receipt",            "#C0C1FF", 11),
        ("Seguros",       "shield",             "#C0C1FF", 12),
        ("Assinaturas",   "subscriptions",      "#C0C1FF", 13),
        ("Pets",          "pets",               "#C0C1FF", 14),
        ("Outros",        "label",              "#C0C1FF", 99),
    ]

    income_categories = [
        ("Salário",       "work",               "#69DC99", 1),
        ("Freelance",     "laptop_mac",         "#69DC99", 2),
        ("Investimentos", "trending_up",        "#69DC99", 3),
        ("Aluguel Rec.",  "house",              "#69DC99", 4),
        ("Presente",      "card_giftcard",      "#69DC99", 5),
        ("Outros Rec.",   "payments",           "#69DC99", 9),
    ]

    transfer_categories = [
        ("Transferência", "swap_horiz",         "#8083FF", 1),
    ]

    rows = []
    for name, icon, color, sort_order in expense_categories:
        rows.append(
            f"('{str(uuid.uuid4())}', '{name}', '{icon}', '{color}', 'expense', NULL, true, {sort_order}, '{now}', '{now}')"
        )
    for name, icon, color, sort_order in income_categories:
        rows.append(
            f"('{str(uuid.uuid4())}', '{name}', '{icon}', '{color}', 'income', NULL, true, {sort_order}, '{now}', '{now}')"
        )
    for name, icon, color, sort_order in transfer_categories:
        rows.append(
            f"('{str(uuid.uuid4())}', '{name}', '{icon}', '{color}', 'transfer', NULL, true, {sort_order}, '{now}', '{now}')"
        )

    values = ",\n".join(rows)
    op.execute(
        f"INSERT INTO categories (id, name, icon, color, type, parent_id, is_system, sort_order, created_at, updated_at) VALUES {values}"
    )


def downgrade() -> None:
    op.drop_table("agent_log")
    op.drop_table("allocation")
    op.drop_table("bills")
    op.drop_table("budgets")
    op.drop_table("goal_contributions")
    op.drop_table("goals")
    op.drop_table("debt_payments")
    op.drop_table("debts")
    op.drop_table("transactions")
    op.drop_table("categories")
    op.drop_table("accounts")
