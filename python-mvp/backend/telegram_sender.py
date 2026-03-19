from __future__ import annotations

from typing import Any

import requests

from shared.models import Incident
from shared.telegram import build_alert_message, build_http_reply_markup


class TelegramNotifier:
    def __init__(self, token: str, chat_id: str):
        self.token = token
        self.chat_id = chat_id

    def send_incident(self, incident: Incident) -> dict[str, Any]:
        if not self.token or not self.chat_id:
            return {"status": "skipped"}
        response = requests.post(
            f"https://api.telegram.org/bot{self.token}/sendMessage",
            json={
                "chat_id": self.chat_id,
                "text": build_alert_message(incident),
                "reply_markup": build_http_reply_markup(incident.incident_id),
            },
            timeout=10,
        )
        response.raise_for_status()
        return response.json()
