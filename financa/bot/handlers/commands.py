"""
Telegram slash command handlers.

Commands:
  /start    - Welcome message
  /saldo    - Monthly balance summary
  /lancamento <valor> <desc> [conta] - Quick transaction entry
  /relatorio - Current month report
  /dividas  - Active debts summary
  /metas    - Goals progress
  /contas   - List accounts
  /ajuda    - Help text

All handlers check chat_id against TELEGRAM_ALLOWED_CHAT_ID.
All actions are logged to agent_log.
"""
import os
import re
from datetime import date

from telegram import InlineKeyboardButton, InlineKeyboardMarkup, Update
from telegram.ext import ContextTypes

from bot.services import api_client, openclaw_bridge

_ALLOWED_CHAT_ID = int(os.environ["TELEGRAM_ALLOWED_CHAT_ID"])


def _check_auth(update: Update) -> bool:
    """Return True if message comes from the allowed chat."""
    if update.effective_chat is None:
        return False
    return update.effective_chat.id == _ALLOWED_CHAT_ID


def _fmt_brl(cents: int) -> str:
    """Format cents to Brazilian currency string."""
    reais = cents / 100
    return f"R$ {reais:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")


async def cmd_start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return
    await update.message.reply_text(
        "💰 *Finança Bot*\n\n"
        "Comandos disponíveis:\n"
        "/saldo — Resumo do mês\n"
        "/lancamento — Lançar transação\n"
        "/relatorio — Relatório mensal\n"
        "/dividas — Dívidas ativas\n"
        "/metas — Progresso das metas\n"
        "/contas — Contas cadastradas\n"
        "/ajuda — Ajuda",
        parse_mode="Markdown",
    )


async def cmd_saldo(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return

    today = date.today()
    try:
        data = await api_client.get_monthly_summary(today.year, today.month)
    except Exception as e:
        await update.message.reply_text(f"❌ Erro ao buscar dados: {e}")
        return

    income = _fmt_brl(data["income_cents"])
    expense = _fmt_brl(data["expense_cents"])
    surplus = _fmt_brl(data["surplus_cents"])
    surplus_icon = "✅" if data["surplus_cents"] >= 0 else "⚠️"

    text = (
        f"📊 *Resumo — {today.strftime('%B/%Y').capitalize()}*\n\n"
        f"💚 Receitas: `{income}`\n"
        f"🔴 Despesas: `{expense}`\n"
        f"{surplus_icon} Sobra: `{surplus}`"
    )

    await update.message.reply_text(text, parse_mode="Markdown")
    await api_client.log_agent_action(
        str(update.effective_chat.id), "/saldo", None, text  # type: ignore[union-attr]
    )


async def cmd_lancamento(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    Usage: /lancamento <valor> <descricao> [tipo]
    Examples:
      /lancamento 89,90 supermercado
      /lancamento +5000 salário receita
    """
    if not _check_auth(update) or update.message is None:
        return

    args = context.args or []
    if len(args) < 2:
        await update.message.reply_text(
            "Uso: /lancamento <valor> <descrição> [despesa|receita]\n"
            "Ex: /lancamento 89,90 Mercado\n"
            "Ex: /lancamento +5000 Salário receita"
        )
        return

    # Parse amount
    raw_amount = args[0].replace(",", ".").lstrip("+")
    try:
        amount_float = float(raw_amount)
    except ValueError:
        await update.message.reply_text("❌ Valor inválido. Use formato: 89,90 ou 89.90")
        return

    amount_cents = round(abs(amount_float) * 100)
    description = " ".join(args[1:-1]) if len(args) > 2 else args[1]

    # Detect type
    last_arg = args[-1].lower() if len(args) > 2 else ""
    if last_arg in ("receita", "r", "+") or args[0].startswith("+"):
        tx_type = "income"
    else:
        tx_type = "expense"

    # Get first active account
    try:
        accounts = await api_client.list_accounts()
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
        return

    if not accounts:
        await update.message.reply_text("❌ Nenhuma conta cadastrada.")
        return

    account = accounts[0]
    type_label = "📗 Receita" if tx_type == "income" else "📕 Despesa"

    # Confirmation keyboard
    keyboard = InlineKeyboardMarkup([
        [
            InlineKeyboardButton("✅ Confirmar", callback_data=f"tx_confirm|{amount_cents}|{description}|{tx_type}|{account['id']}"),
            InlineKeyboardButton("❌ Cancelar", callback_data="tx_cancel"),
        ]
    ])

    await update.message.reply_text(
        f"{type_label}: `{_fmt_brl(amount_cents)}`\n"
        f"📝 {description}\n"
        f"🏦 {account['name']}\n\n"
        "Confirmar lançamento?",
        parse_mode="Markdown",
        reply_markup=keyboard,
    )


async def cmd_relatorio(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return

    today = date.today()
    try:
        data = await api_client.get_monthly_summary(today.year, today.month)
        txns = await api_client.list_transactions(limit=5)
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
        return

    lines = [f"📈 *Relatório {today.strftime('%B/%Y').capitalize()}*\n"]
    lines.append(f"Receitas: `{_fmt_brl(data['income_cents'])}`")
    lines.append(f"Despesas: `{_fmt_brl(data['expense_cents'])}`")
    lines.append(f"Sobra: `{_fmt_brl(data['surplus_cents'])}`\n")

    if txns:
        lines.append("*Últimas transações:*")
        for t in txns[:5]:
            icon = "💚" if t["type"] == "income" else "🔴"
            lines.append(f"{icon} {t['description'][:30]} — `{_fmt_brl(t['amount_cents'])}`")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_dividas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return

    try:
        debts = await api_client.list_debts()
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
        return

    if not debts:
        await update.message.reply_text("✅ Nenhuma dívida ativa!")
        return

    active = [d for d in debts if d["status"] == "active"]
    total = sum(d["current_balance_cents"] for d in active)

    lines = [f"💳 *Dívidas Ativas ({len(active)})*\n"]
    for d in active[:8]:
        rate_pct = float(d["interest_rate_monthly"]) * 100
        lines.append(
            f"• {d['name'][:25]}: `{_fmt_brl(d['current_balance_cents'])}` "
            f"({rate_pct:.1f}% a.m.)"
        )

    lines.append(f"\nTotal: `{_fmt_brl(total)}`")
    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_metas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return

    try:
        goals = await api_client.list_goals()
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
        return

    if not goals:
        await update.message.reply_text("📭 Nenhuma meta cadastrada.")
        return

    active = [g for g in goals if g["status"] == "active"]
    lines = [f"🎯 *Metas ({len(active)})*\n"]
    for g in active[:8]:
        pct = g["current_cents"] / g["target_cents"] * 100 if g["target_cents"] > 0 else 0
        bar = "█" * int(pct // 10) + "░" * (10 - int(pct // 10))
        lines.append(
            f"• {g['name'][:20]}\n"
            f"  `{bar}` {pct:.0f}%\n"
            f"  {_fmt_brl(g['current_cents'])} / {_fmt_brl(g['target_cents'])}"
        )

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_contas(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return

    try:
        accounts = await api_client.list_accounts()
    except Exception as e:
        await update.message.reply_text(f"❌ Erro: {e}")
        return

    if not accounts:
        await update.message.reply_text("📭 Nenhuma conta cadastrada.")
        return

    lines = ["🏦 *Contas*\n"]
    for a in accounts:
        lines.append(f"• {a['name']} ({a['bank']}): `{_fmt_brl(a['balance_cents'])}`")

    await update.message.reply_text("\n".join(lines), parse_mode="Markdown")


async def cmd_ajuda(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if not _check_auth(update) or update.message is None:
        return
    await cmd_start(update, context)


async def cmd_ai(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """
    /ai <pergunta> — Forward natural language question to OpenClaw agent.
    Falls back to a basic finance summary if OpenClaw not configured.
    """
    if not _check_auth(update) or update.message is None:
        return

    args = context.args or []
    if not args:
        await update.message.reply_text("Uso: /ai <sua pergunta financeira>")
        return

    question = " ".join(args)

    # Build context from current data
    try:
        today = date.today()
        summary = await api_client.get_monthly_summary(today.year, today.month)
        ctx = {
            "income_cents": summary["income_cents"],
            "expense_cents": summary["expense_cents"],
            "surplus_cents": summary["surplus_cents"],
        }
    except Exception:
        ctx = {}

    response = await openclaw_bridge.ask(question, ctx)
    if response:
        await update.message.reply_text(f"🤖 {response}")
    else:
        await update.message.reply_text(
            "ℹ️ OpenClaw não configurado. Use /relatorio para ver dados financeiros."
        )
