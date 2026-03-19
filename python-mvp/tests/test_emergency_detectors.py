import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from vision.detectors import DetectorSignal
from vision.keypoint_history import KeypointHistory, TrackHistory
from vision.emergency_detectors import (
    HelpGestureDetector,
    ChestPainDetector,
    StrokeDetector,
)


def _make_kp(**overrides):
    """Build a full keypoints dict with defaults at (0,0,0.0) and overrides."""
    names = [
        "nose", "left_eye", "right_eye", "left_ear", "right_ear",
        "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
        "left_wrist", "right_wrist", "left_hip", "right_hip",
        "left_knee", "right_knee", "left_ankle", "right_ankle",
    ]
    kp = {n: (0.0, 0.0, 0.0) for n in names}
    kp.update(overrides)
    return kp


class TestKeypointHistory(unittest.TestCase):
    def test_velocity_computation(self):
        hist = KeypointHistory()
        kp1 = _make_kp(nose=(100.0, 200.0, 0.9))
        kp2 = _make_kp(nose=(100.0, 250.0, 0.9))
        hist.update("t1", 1.0, kp1)
        hist.update("t1", 1.5, kp2)
        th = hist.get("t1")
        vel = th.velocity("nose", window=1.0)
        self.assertIsNotNone(vel)
        self.assertAlmostEqual(vel[0], 0.0, places=1)
        self.assertAlmostEqual(vel[1], 100.0, places=1)  # 50px / 0.5s

    def test_zigzag_variance_straight_line(self):
        hist = KeypointHistory()
        for i in range(10):
            kp = _make_kp(left_hip=(100.0 + i * 10, 200.0, 0.9))
            hist.update("t1", float(i), kp)
        th = hist.get("t1")
        zz = th.zigzag_variance("left_hip", 20.0)
        self.assertLess(zz, 5.0)  # nearly straight

    def test_zigzag_variance_erratic(self):
        hist = KeypointHistory()
        for i in range(10):
            x = 100.0 + (i * 10 if i % 2 == 0 else -i * 10)
            kp = _make_kp(left_hip=(x, 200.0 + i * 5, 0.9))
            hist.update("t1", float(i), kp)
        th = hist.get("t1")
        zz = th.zigzag_variance("left_hip", 20.0)
        self.assertGreater(zz, 20.0)  # very erratic


class TestHelpGestureDetector(unittest.TestCase):
    def test_wrists_above_eyes_triggers_after_hold(self):
        hist = KeypointHistory()
        det = HelpGestureDetector(hist, hold_seconds=3.0)

        # Wrists at y=50, eyes at y=200 (wrists above)
        kp = _make_kp(
            left_wrist=(100.0, 50.0, 0.9), right_wrist=(200.0, 50.0, 0.9),
            left_eye=(120.0, 200.0, 0.9), right_eye=(180.0, 200.0, 0.9),
        )
        obs = [{"track_id": "t1", "keypoints": kp, "bbox": (50, 30, 250, 500)}]

        # Frame at t=0
        hist.update("t1", 0.0, kp)
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 0)

        # Frame at t=2
        hist.update("t1", 2.0, kp)
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 0)

        # Frame at t=3.5 -> should trigger
        hist.update("t1", 3.5, kp)
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].event_type, "help_gesture")

    def test_no_trigger_if_wrists_below_eyes(self):
        hist = KeypointHistory()
        det = HelpGestureDetector(hist, hold_seconds=3.0)

        kp = _make_kp(
            left_wrist=(100.0, 300.0, 0.9), right_wrist=(200.0, 300.0, 0.9),
            left_eye=(120.0, 200.0, 0.9), right_eye=(180.0, 200.0, 0.9),
        )
        obs = [{"track_id": "t1", "keypoints": kp, "bbox": (50, 30, 250, 500)}]

        hist.update("t1", 0.0, kp)
        det.detect(None, obs)
        hist.update("t1", 5.0, kp)
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 0)


class TestChestPainDetector(unittest.TestCase):
    def test_wrist_near_sternum_plus_nose_drop(self):
        hist = KeypointHistory()
        det = ChestPainDetector(hist, sternum_radius_frac=0.15, nose_velocity_threshold=100.0)

        # Sternum is midpoint of shoulders: (150, 200)
        # Wrist at (155, 205) is within radius
        kp1 = _make_kp(
            left_shoulder=(100.0, 200.0, 0.9), right_shoulder=(200.0, 200.0, 0.9),
            left_wrist=(155.0, 205.0, 0.9), right_wrist=(300.0, 400.0, 0.9),
            nose=(150.0, 100.0, 0.9),
        )
        kp2 = _make_kp(
            left_shoulder=(100.0, 200.0, 0.9), right_shoulder=(200.0, 200.0, 0.9),
            left_wrist=(155.0, 205.0, 0.9), right_wrist=(300.0, 400.0, 0.9),
            nose=(150.0, 180.0, 0.9),  # nose dropped 80px in 0.5s = 160px/s
        )
        obs = [{"track_id": "t1", "keypoints": kp2, "bbox": (50, 50, 250, 500)}]

        hist.update("t1", 0.0, kp1)
        hist.update("t1", 0.5, kp2)
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].event_type, "chest_pain")


class TestStrokeDetector(unittest.TestCase):
    def test_zigzag_plus_laying_triggers(self):
        hist = KeypointHistory()
        det = StrokeDetector(hist, zigzag_threshold=20.0, trajectory_window=10.0)

        # Build erratic hip trajectory
        for i in range(15):
            x = 100.0 + (i * 15 if i % 2 == 0 else -i * 15)
            kp = _make_kp(left_hip=(x, 200.0 + i * 5, 0.9))
            hist.update("t1", float(i), kp)

        obs = [{"track_id": "t1", "posture": "laying", "keypoints": {}, "bbox": (0, 0, 100, 100)}]
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 1)
        self.assertEqual(signals[0].event_type, "stroke_disorientation")

    def test_no_trigger_if_standing(self):
        hist = KeypointHistory()
        det = StrokeDetector(hist, zigzag_threshold=20.0, trajectory_window=10.0)

        for i in range(15):
            x = 100.0 + (i * 15 if i % 2 == 0 else -i * 15)
            kp = _make_kp(left_hip=(x, 200.0 + i * 5, 0.9))
            hist.update("t1", float(i), kp)

        obs = [{"track_id": "t1", "posture": "standing", "keypoints": {}, "bbox": (0, 0, 100, 100)}]
        signals = det.detect(None, obs)
        self.assertEqual(len(signals), 0)


if __name__ == "__main__":
    unittest.main()
