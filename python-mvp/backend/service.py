from __future__ import annotations

from shared.models import Incident, VolunteerAction


class IncidentService:
    def __init__(self, store, notifier):
        self.store = store
        self.notifier = notifier

    def submit_incident(self, incident: Incident) -> dict:
        duplicate = self.store.find_open_duplicate(incident)
        if duplicate:
            return {"status": "duplicate", "incident": duplicate}
        self.store.add_incident(incident)
        self.notifier.send_incident(incident)
        return {"status": "created", "incident": incident.to_dict()}

    def record_volunteer_action(self, action: VolunteerAction) -> dict:
        incident = self.store.get_incident(action.incident_id)
        if incident is None:
            return {"status": "not_found", "incident_id": action.incident_id}
        self.store.add_response(action)
        return {"status": "recorded", "incident_id": action.incident_id, "action": action.action}
