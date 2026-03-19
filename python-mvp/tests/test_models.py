import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from shared.models import Incident


class IncidentModelTests(unittest.TestCase):
    def test_incident_serializes_required_fields(self):
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
            dwell_seconds=11.2,
            bbox={"x1": 10, "y1": 20, "x2": 110, "y2": 220},
            keypoints_summary={"nose": [50, 30], "left_shoulder": [40, 80]},
            frame_ref="frames/inc-1.jpg",
            privacy_mode="head_blur",
            metadata={"detector": "fall"},
        )

        payload = incident.to_dict()

        self.assertEqual(payload["incident_id"], "inc-1")
        self.assertEqual(payload["incident_type"], "fall_detected")
        self.assertEqual(payload["person_track_id"], "track-7")
        self.assertEqual(payload["privacy_mode"], "head_blur")
        self.assertEqual(payload["metadata"]["detector"], "fall")


if __name__ == "__main__":
    unittest.main()
