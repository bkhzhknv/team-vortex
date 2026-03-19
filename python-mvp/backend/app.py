from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI, HTTPException

from backend.service import IncidentService
from backend.store import JsonIncidentStore
from backend.telegram_sender import TelegramNotifier
from shared.config import load_settings
from shared.models import Incident, VolunteerAction

settings = load_settings()
store = JsonIncidentStore(Path(__file__).resolve().parent / "data" / "incidents.json")
notifier = TelegramNotifier(settings.telegram_bot_token, settings.volunteer_chat_id)
service = IncidentService(store=store, notifier=notifier)
app = FastAPI(title="Smart City Public Safety MVP", version="0.1.0")


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/incidents")
def list_incidents() -> dict[str, list[dict]]:
    return {"incidents": store.list_incidents(), "responses": store.list_responses()}


@app.post("/incident")
def create_incident(payload: dict) -> dict:
    try:
        incident = Incident.from_dict(payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return service.submit_incident(incident)


@app.post("/incident/{incident_id}/volunteer-action")
def create_volunteer_action(incident_id: str, payload: dict) -> dict:
    merged = dict(payload)
    merged["incident_id"] = incident_id
    try:
        action = VolunteerAction.from_dict(merged)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    result = service.record_volunteer_action(action)
    if result["status"] == "not_found":
        raise HTTPException(status_code=404, detail="incident not found")
    return result


@app.get("/report")
def report() -> dict:
    """Operator report: summary of open fall incidents."""
    all_incidents = store.list_incidents()
    open_incidents = [i for i in all_incidents if i.get("status") not in ("resolved",)]
    locations = {}
    for inc in open_incidents:
        loc = inc.get("location_label", "unknown")
        locations[loc] = locations.get(loc, 0) + 1
    return {
        "total_incidents": len(all_incidents),
        "open_incidents": len(open_incidents),
        "resolved_incidents": len(all_incidents) - len(open_incidents),
        "incidents_by_location": locations,
        "recent_open": open_incidents[-10:],
    }
