import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.fall import FallTracker


class FallTrackerTests(unittest.TestCase):
    def test_incident_is_only_emitted_after_ten_seconds_on_ground(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)

        decision = tracker.update("track-1", "upright", 0.0)
        self.assertIsNone(decision)

        tracker.update("track-1", "ground", 2.0)
        tracker.update("track-1", "ground", 8.0)
        decision = tracker.update("track-1", "ground", 11.9)
        self.assertIsNone(decision)

        decision = tracker.update("track-1", "ground", 12.1)
        self.assertIsNotNone(decision)
        self.assertEqual(decision.track_id, "track-1")
        self.assertGreaterEqual(decision.dwell_seconds, 10.0)

        second = tracker.update("track-1", "ground", 15.0)
        self.assertIsNone(second)

    def test_state_resets_after_person_recovers(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)

        tracker.update("track-1", "ground", 0.0)
        tracker.update("track-1", "upright", 4.0)
        decision = tracker.update("track-1", "ground", 6.0)

        self.assertIsNone(decision)
        self.assertEqual(tracker.states["track-1"].ground_since, 6.0)


if __name__ == "__main__":
    unittest.main()
