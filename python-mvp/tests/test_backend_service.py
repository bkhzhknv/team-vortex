import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from backend.service import IncidentService
from backend.store import JsonIncidentStore
from shared.models import Incident, VolunteerAction


class FakeNotifier:
    def __init__(self):
        self.sent = []

    def send_incident(self, incident):
        self.sent.append(incident.incident_id)


class BackendServiceTests(unittest.TestCase):
    def test_submit_incident_persists_and_notifies_once(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = JsonIncidentStore(Path(tmp_dir) / "incidents.json")
            notifier = FakeNotifier()
            service = IncidentService(store=store, notifier=notifier)

            incident = Incident(
                incident_id="inc-1",
                incident_type="fall_detected",
                severity="high",
                source_id="camera-01",
                timestamp_utc="2026-03-19T12:00:00Z",
                location_label="Crosswalk A",
                person_track_id="track-7",
                confidence=0.88,
                status="open",
                dwell_seconds=12.0,
                bbox={"x1": 10, "y1": 20, "x2": 110, "y2": 220},
                keypoints_summary={"nose": [50, 30]},
                frame_ref="frames/inc-1.jpg",
                privacy_mode="head_blur",
                metadata={"detector": "fall"},
            )

            created = service.submit_incident(incident)
            duplicate = service.submit_incident(incident)

            self.assertEqual(created["status"], "created")
            self.assertEqual(duplicate["status"], "duplicate")
            self.assertEqual(notifier.sent, ["inc-1"])
            self.assertEqual(len(store.list_incidents()), 1)

    def test_record_volunteer_action_updates_store(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            store = JsonIncidentStore(Path(tmp_dir) / "incidents.json")
            notifier = FakeNotifier()
            service = IncidentService(store=store, notifier=notifier)

            incident = Incident(
                incident_id="inc-1",
                incident_type="fall_detected",
                severity="high",
                source_id="camera-01",
                timestamp_utc="2026-03-19T12:00:00Z",
                location_label="Crosswalk A",
                person_track_id="track-7",
                confidence=0.88,
                status="open",
                dwell_seconds=12.0,
                bbox={"x1": 10, "y1": 20, "x2": 110, "y2": 220},
                keypoints_summary={"nose": [50, 30]},
                frame_ref="frames/inc-1.jpg",
                privacy_mode="head_blur",
                metadata={"detector": "fall"},
            )
            service.submit_incident(incident)

            action = VolunteerAction(
                incident_id="inc-1",
                action="accept",
                user_id=101,
                username="volunteer_one",
                timestamp_utc="2026-03-19T12:00:10Z",
            )
            result = service.record_volunteer_action(action)

            self.assertEqual(result["status"], "recorded")
            self.assertEqual(store.list_responses()[0]["action"], "accept")


if __name__ == "__main__":
    unittest.main()
