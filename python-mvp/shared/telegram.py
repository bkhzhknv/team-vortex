from __future__ import annotations

from typing import Any

from shared.models import Incident


def build_alert_message(incident: Incident) -> str:
    severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}.get(incident.severity, "⚪")
    return (
        "🚨 Smart City Safety Alert 🚨\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"⚠️  Type: {incident.incident_type.replace('_', ' ').title()}\n"
        f"{severity_icon}  Severity: {incident.severity.upper()}\n"
        f"📍  Location: {incident.location_label}\n"
        f"📷  Camera: {incident.source_id}\n"
        f"👤  Track ID: {incident.person_track_id}\n"
        f"⏱  On ground: {incident.dwell_seconds:.1f} seconds\n"
        f"📊  Confidence: {incident.confidence:.0%}\n"
        f"🕐  Time: {incident.timestamp_utc}\n"
        "━━━━━━━━━━━━━━━━━━━━━━━━━\n"
        f"🆔  {incident.incident_id}\n"
        "\n"
        "⬇️  Respond using the buttons below"
    )


def build_button_rows(incident_id: str) -> list[list[dict[str, str]]]:
    return [
        [{"text": "✅ Accept", "callback_data": f"incident:{incident_id}:action:accept"}],
        [{"text": "🚗 On my way", "callback_data": f"incident:{incident_id}:action:enroute"}],
        [{"text": "✔️ Resolved", "callback_data": f"incident:{incident_id}:action:resolved"}],
    ]


def build_http_reply_markup(incident_id: str) -> dict[str, Any]:
    return {"inline_keyboard": build_button_rows(incident_id)}


def parse_callback_data(data: str) -> dict[str, str]:
    parts = data.split(":")
    if len(parts) != 4 or parts[0] != "incident" or parts[2] != "action":
        raise ValueError("invalid callback data")
    return {"incident_id": parts[1], "action": parts[3]}
