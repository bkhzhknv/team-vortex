import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.fall import FallTracker


class FallTrackerTests(unittest.TestCase):
    def test_incident_is_only_emitted_after_ten_seconds_on_ground(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)

        decision = tracker.update("track-1", "standing", 0.0)
        self.assertIsNone(decision)

        tracker.update("track-1", "laying", 2.0)
        tracker.update("track-1", "laying", 8.0)
        decision = tracker.update("track-1", "laying", 11.9)
        self.assertIsNone(decision)

        decision = tracker.update("track-1", "laying", 12.1)
        self.assertIsNotNone(decision)
        self.assertEqual(decision.track_id, "track-1")
        self.assertGreaterEqual(decision.dwell_seconds, 10.0)

        second = tracker.update("track-1", "laying", 15.0)
        self.assertIsNone(second)

    def test_state_resets_after_person_recovers(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)

        tracker.update("track-1", "laying", 0.0)
        tracker.update("track-1", "standing", 4.0)
        decision = tracker.update("track-1", "laying", 6.0)

        self.assertIsNone(decision)
        self.assertEqual(tracker.states["track-1"].ground_since, 6.0)

    def test_get_dwell_seconds_returns_elapsed_time(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)
        tracker.update("track-1", "laying", 5.0)
        self.assertAlmostEqual(tracker.get_dwell_seconds("track-1", 8.0), 3.0)

    def test_get_dwell_seconds_returns_zero_for_standing(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)
        tracker.update("track-1", "standing", 5.0)
        self.assertEqual(tracker.get_dwell_seconds("track-1", 8.0), 0.0)

    def test_is_alerted_returns_true_after_threshold(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)
        tracker.update("track-1", "laying", 0.0)
        tracker.update("track-1", "laying", 11.0)
        self.assertTrue(tracker.is_alerted("track-1"))

    def test_is_alerted_returns_false_before_threshold(self):
        tracker = FallTracker(dwell_threshold_seconds=10.0)
        tracker.update("track-1", "laying", 0.0)
        tracker.update("track-1", "laying", 5.0)
        self.assertFalse(tracker.is_alerted("track-1"))


if __name__ == "__main__":
    unittest.main()
