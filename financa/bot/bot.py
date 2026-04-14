"""
Finança Telegram Bot entry point — webhook mode.

Telegram sends POST requests to:
  https://<domain>/telegram/webhook/<TELEGRAM_WEBHOOK_SECRET>

Security:
  - X-Telegram-Bot-Api-Secret-Token header validated by PTB automatically
  - Only the configured chat_id gets responses (handled in each command)
"""
import logging
import os

from dotenv import load_dotenv
from telegram.ext import (
    Application,
    CallbackQueryHandler,
    CommandHandler,
)

load_dotenv()

logging.basicConfig(
    format="%(asctime)s %(levelname)s [%(name)s] %(message)s",
    level=logging.INFO,
)
logger = logging.getLogger("financa.bot")


def main() -> None:
    token = os.environ["TELEGRAM_TOKEN"]
    webhook_url = os.environ["TELEGRAM_WEBHOOK_URL"]          # full public URL
    webhook_secret = os.environ["TELEGRAM_WEBHOOK_SECRET"]    # random hex string
    listen_port = int(os.environ.get("BOT_WEBHOOK_PORT", "8443"))

    # Import handlers after load_dotenv so env vars are available
    from bot.handlers.callbacks import handle_callback
    from bot.handlers.commands import (
        cmd_ai,
        cmd_ajuda,
        cmd_contas,
        cmd_dividas,
        cmd_lancamento,
        cmd_metas,
        cmd_relatorio,
        cmd_saldo,
        cmd_start,
    )

    app = Application.builder().token(token).build()

    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("saldo", cmd_saldo))
    app.add_handler(CommandHandler("lancamento", cmd_lancamento))
    app.add_handler(CommandHandler("relatorio", cmd_relatorio))
    app.add_handler(CommandHandler("dividas", cmd_dividas))
    app.add_handler(CommandHandler("metas", cmd_metas))
    app.add_handler(CommandHandler("contas", cmd_contas))
    app.add_handler(CommandHandler("ajuda", cmd_ajuda))
    app.add_handler(CommandHandler("ai", cmd_ai))
    app.add_handler(CallbackQueryHandler(handle_callback))

    # Webhook path = last segment of the full URL
    # Full URL format: https://yourdomain.com/telegram/webhook/<secret>
    url_path = f"telegram/webhook/{webhook_secret}"

    logger.info("Bot starting (webhook) on port %s", listen_port)
    app.run_webhook(
        listen="0.0.0.0",
        port=listen_port,
        url_path=url_path,
        webhook_url=f"{webhook_url.rstrip('/')}/{url_path}",
        secret_token=webhook_secret,
        drop_pending_updates=True,
        # Allow workers to process updates concurrently
        allowed_updates=["message", "callback_query"],
    )


if __name__ == "__main__":
    main()
