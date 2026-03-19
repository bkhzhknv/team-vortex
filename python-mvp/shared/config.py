import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    telegram_bot_token: str
    volunteer_chat_id: str
    backend_url: str


def load_settings() -> Settings:
    load_dotenv(Path(__file__).resolve().parents[1] / ".env")
    return Settings(
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
        volunteer_chat_id=os.getenv("VOLUNTEER_CHAT_ID", "").strip(),
        backend_url=os.getenv("BACKEND_URL", "").rstrip("/"),
    )
