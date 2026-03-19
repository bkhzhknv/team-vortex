from __future__ import annotations

import cv2
import numpy as np
from enum import Enum
from time import time

from vision.detectors import DetectorSignal
from vision.keypoint_history import KeypointHistory


class EarthquakeState(Enum):
    IDLE = "idle"
    SHAKING = "shaking"
    RESCUE_SCAN = "rescue_scan"


LOWER_BODY_INDICES = ["left_hip", "right_hip", "left_knee", "right_knee", "left_ankle", "right_ankle"]


class EarthquakeDetector:
    name = "earthquake"

    def __init__(self, history: KeypointHistory,
                 shake_duration: float = 2.0,
                 shake_threshold: float = 8.0,
                 rescue_window: float = 60.0,
                 trapped_motionless_sec: float = 3.0,
                 trapped_occluded_frac: float = 0.4):
        self.history = history
        self.shake_duration = shake_duration
        self.shake_threshold = shake_threshold
        self.rescue_window = rescue_window
        self.trapped_motionless_sec = trapped_motionless_sec
        self.trapped_occluded_frac = trapped_occluded_frac

        self.state = EarthquakeState.IDLE
        self._prev_gray = None
        self._shake_start: float | None = None
        self._rescue_start: float | None = None
        self._earthquake_alerted = False
        self._trapped_alerted: set[str] = set()
        self._motionless_since: dict[str, float] = {}

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        now = time()
        signals: list[DetectorSignal] = []

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY) if frame is not None else None
        global_motion = self._compute_global_motion(gray)

        if self.state == EarthquakeState.IDLE:
            if global_motion > self.shake_threshold:
                if self._shake_start is None:
                    self._shake_start = now
                elif (now - self._shake_start) >= self.shake_duration:
                    self.state = EarthquakeState.SHAKING
                    self._earthquake_alerted = False
            else:
                self._shake_start = None

        elif self.state == EarthquakeState.SHAKING:
            if not self._earthquake_alerted:
                self._earthquake_alerted = True
                signals.append(DetectorSignal(
                    detector_name=self.name,
                    event_type="earthquake_warning",
                    severity="critical",
                    confidence=0.85,
                    metadata={"global_motion": round(global_motion, 2)},
                ))

            if global_motion < self.shake_threshold * 0.5:
                self.state = EarthquakeState.RESCUE_SCAN
                self._rescue_start = now
                self._trapped_alerted.clear()
                self._motionless_since.clear()

        elif self.state == EarthquakeState.RESCUE_SCAN:
            if (now - self._rescue_start) > self.rescue_window:
                self.state = EarthquakeState.IDLE
                self._shake_start = None
                self._rescue_start = None
            else:
                trapped = self._scan_trapped(observations, now, frame.shape[0] if frame is not None else 480)
                signals.extend(trapped)

        self._prev_gray = gray
        return signals

    def _compute_global_motion(self, gray) -> float:
        if self._prev_gray is None or gray is None:
            return 0.0
        if self._prev_gray.shape != gray.shape:
            return 0.0
        flow = cv2.calcOpticalFlowFarneback(
            self._prev_gray, gray, None,
            pyr_scale=0.5, levels=1, winsize=15,
            iterations=2, poly_n=5, poly_sigma=1.1, flags=0,
        )
        mag = np.sqrt(flow[..., 0] ** 2 + flow[..., 1] ** 2)
        return float(np.mean(mag))

    def _scan_trapped(self, observations: list[dict], now: float, frame_h: int) -> list[DetectorSignal]:
        signals = []
        persons = [o for o in observations if "keypoints" in o and o.get("keypoints")]

        for obs in persons:
            track_id = obs.get("track_id", "")
            kp = obs.get("keypoints", {})

            if track_id in self._trapped_alerted:
                continue

            visible_pts = [(name, p) for name, p in kp.items() if p[2] >= 0.2]
            if not visible_pts:
                continue

            avg_y = sum(p[1] for _, p in visible_pts) / len(visible_pts)
            near_bottom = avg_y >= frame_h * 0.6

            if not near_bottom:
                self._motionless_since.pop(track_id, None)
                continue

            th = self.history.get(track_id)
            if th is None:
                continue

            is_motionless = True
            for kp_name in ["nose", "left_shoulder", "right_shoulder"]:
                vel = th.velocity(kp_name, window=1.0)
                if vel is not None and (abs(vel[0]) > 5.0 or abs(vel[1]) > 5.0):
                    is_motionless = False
                    break

            if not is_motionless:
                self._motionless_since.pop(track_id, None)
                continue

            if track_id not in self._motionless_since:
                self._motionless_since[track_id] = now
                continue

            if (now - self._motionless_since[track_id]) < self.trapped_motionless_sec:
                continue

            lower_body = [kp.get(name) for name in LOWER_BODY_INDICES]
            low_conf_count = sum(1 for p in lower_body if p is None or p[2] < 0.2)
            occluded_frac = low_conf_count / len(LOWER_BODY_INDICES)

            if occluded_frac >= self.trapped_occluded_frac:
                self._trapped_alerted.add(track_id)
                signals.append(DetectorSignal(
                    detector_name=self.name,
                    event_type="person_trapped_debris",
                    severity="critical",
                    confidence=0.80,
                    metadata={
                        "track_id": track_id,
                        "occluded_fraction": round(occluded_frac, 2),
                        "motionless_seconds": round(now - self._motionless_since[track_id], 1),
                    },
                ))

        return signals
