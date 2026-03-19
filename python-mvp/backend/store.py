from __future__ import annotations

import json
from pathlib import Path
from threading import Lock

from shared.models import Incident, VolunteerAction


class JsonIncidentStore:
    def __init__(self, file_path: Path):
        self.file_path = Path(file_path)
        self.file_path.parent.mkdir(parents=True, exist_ok=True)
        self._lock = Lock()
        if not self.file_path.exists():
            self._write({"incidents": [], "responses": []})

    def _read(self) -> dict:
        with self.file_path.open("r", encoding="utf-8") as handle:
            return json.load(handle)

    def _write(self, payload: dict) -> None:
        with self.file_path.open("w", encoding="utf-8") as handle:
            json.dump(payload, handle, ensure_ascii=True, indent=2)

    def add_incident(self, incident: Incident) -> None:
        with self._lock:
            payload = self._read()
            payload["incidents"].append(incident.to_dict())
            self._write(payload)

    def list_incidents(self) -> list[dict]:
        with self._lock:
            return self._read()["incidents"]

    def get_incident(self, incident_id: str) -> dict | None:
        with self._lock:
            for incident in self._read()["incidents"]:
                if incident["incident_id"] == incident_id:
                    return incident
        return None

    def find_open_duplicate(self, incident: Incident) -> dict | None:
        with self._lock:
            incidents = self._read()["incidents"]
            for existing in incidents:
                if (
                    existing["status"] != "resolved"
                    and existing["source_id"] == incident.source_id
                    and existing["person_track_id"] == incident.person_track_id
                    and existing["incident_type"] == incident.incident_type
                ):
                    return existing
        return None

    def add_response(self, action: VolunteerAction) -> None:
        with self._lock:
            payload = self._read()
            payload["responses"].append(action.to_dict())
            for incident in payload["incidents"]:
                if incident["incident_id"] == action.incident_id:
                    if action.action == "resolved":
                        incident["status"] = "resolved"
                    elif action.action == "enroute":
                        incident["status"] = "enroute"
                    elif action.action == "accept":
                        incident["status"] = "accepted"
                    break
            self._write(payload)

    def list_responses(self) -> list[dict]:
        with self._lock:
            return self._read()["responses"]
