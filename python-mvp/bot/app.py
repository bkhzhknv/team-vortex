from __future__ import annotations

import asyncio

import requests
from telegram import Update
from telegram.ext import ApplicationBuilder, CallbackQueryHandler, CommandHandler, ContextTypes

from shared.config import load_settings
from shared.models import VolunteerAction, utc_now_iso
from shared.telegram import parse_callback_data

settings = load_settings()


async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    if update.message:
        await update.message.reply_text("Volunteer bot is active and ready for emergency callbacks.")


def post_action(action: VolunteerAction) -> dict:
    response = requests.post(
        f"{settings.backend_url}/incident/{action.incident_id}/volunteer-action",
        json=action.to_dict(),
        timeout=10,
    )
    response.raise_for_status()
    return response.json()


async def handle_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    query = update.callback_query
    if query is None or query.data is None or query.from_user is None:
        return
    parsed = parse_callback_data(query.data)
    action = VolunteerAction(
        incident_id=parsed["incident_id"],
        action=parsed["action"],
        user_id=query.from_user.id,
        username=query.from_user.username or query.from_user.full_name,
        timestamp_utc=utc_now_iso(),
    )
    await asyncio.to_thread(post_action, action)
    await query.answer(f"{parsed['action']} recorded")
    if query.message:
        await query.message.reply_text(
            f"Volunteer {action.username} selected {action.action} for incident {action.incident_id}."
        )


def main() -> None:
    if not settings.telegram_bot_token:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is required")
    if not settings.backend_url:
        raise RuntimeError("BACKEND_URL is required")
    application = ApplicationBuilder().token(settings.telegram_bot_token).build()
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CallbackQueryHandler(handle_callback))
    application.run_polling()


if __name__ == "__main__":
    main()
