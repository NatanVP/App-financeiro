"""Inline keyboard callback handlers."""
from datetime import date

from telegram import Update
from telegram.ext import ContextTypes

from bot.services import api_client


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None:
        return
    await query.answer()

    data = query.data or ""

    if data == "tx_cancel":
        await query.edit_message_text("❌ Lançamento cancelado.")
        return

    if data.startswith("tx_confirm|"):
        parts = data.split("|")
        if len(parts) != 5:
            await query.edit_message_text("❌ Dados inválidos.")
            return

        _, amount_cents_str, description, tx_type, account_id = parts
        amount_cents = int(amount_cents_str)

        try:
            txn = await api_client.create_transaction(
                account_id=account_id,
                amount_cents=amount_cents,
                tx_type=tx_type,
                description=description,
                date_str=date.today().isoformat(),
            )
            type_label = "Receita" if tx_type == "income" else "Despesa"
            reais = amount_cents / 100
            brl = f"R$ {reais:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")
            await query.edit_message_text(
                f"✅ {type_label} lançada!\n"
                f"💰 {brl} — {description}\n"
                f"ID: `{txn['id'][:8]}...`",
                parse_mode="Markdown",
            )
        except Exception as e:
            await query.edit_message_text(f"❌ Erro ao salvar: {e}")

        await api_client.log_agent_action(
            str(query.from_user.id) if query.from_user else "unknown",
            "tx_confirm",
            f"{amount_cents}|{description}|{tx_type}",
            "confirmed",
        )
