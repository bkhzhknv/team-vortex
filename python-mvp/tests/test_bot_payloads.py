import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from shared.models import Incident
from shared.telegram import build_alert_message, build_button_rows, parse_callback_data


class TelegramPayloadTests(unittest.TestCase):
    def test_alert_message_contains_core_incident_fields(self):
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

        message = build_alert_message(incident)

        self.assertIn("fall_detected", message)
        self.assertIn("Crosswalk A", message)
        self.assertIn("inc-1", message)

    def test_button_rows_and_callback_round_trip(self):
        rows = build_button_rows("inc-1")
        callback = rows[0][0]["callback_data"]

        parsed = parse_callback_data(callback)

        self.assertEqual(parsed["incident_id"], "inc-1")
        self.assertEqual(parsed["action"], "accept")


if __name__ == "__main__":
    unittest.main()
