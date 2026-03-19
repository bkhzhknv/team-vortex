"""Emergency detector plugins for the vision pipeline.

Each detector implements the DetectorPlugin protocol from vision.detectors.
Detectors receive per-frame observations (person poses + detected objects)
and emit DetectorSignal instances when emergency conditions are met.
"""
from __future__ import annotations

import math

from vision.detectors import DetectorSignal
from vision.keypoint_history import KeypointHistory


# ── Helpers ────────────────────────────────────────────────────────────

def _kp_conf(kp: tuple[float, float, float] | None, min_conf: float = 0.2) -> bool:
    return kp is not None and kp[2] >= min_conf


def _midpoint_xy(a: tuple[float, float, float], b: tuple[float, float, float]) -> tuple[float, float]:
    return ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)


def _dist(a: tuple[float, float], b: tuple[float, float]) -> float:
    return math.hypot(a[0] - b[0], a[1] - b[1])


# ═══════════════════════════════════════════════════════════════════════
# 1. Active Help Gesture  (Yellow Alert — Volunteer)
# ═══════════════════════════════════════════════════════════════════════

class HelpGestureDetector:
    """Wrists above eye level OR crossed in front of chest for >3s."""

    name = "help_gesture"

    def __init__(self, history: KeypointHistory, hold_seconds: float = 3.0):
        self.history = history
        self.hold_seconds = hold_seconds
        # track_id -> timestamp when gesture first detected
        self._gesture_since: dict[str, float] = {}
        self._alerted: set[str] = set()

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        signals: list[DetectorSignal] = []
        active_ids: set[str] = set()

        for obs in observations:
            kp = obs.get("keypoints", {})
            track_id = obs.get("track_id", "")
            active_ids.add(track_id)

            lw = kp.get("left_wrist")
            rw = kp.get("right_wrist")
            le = kp.get("left_eye")
            re = kp.get("right_eye")

            if not (_kp_conf(lw) and _kp_conf(rw)):
                self._gesture_since.pop(track_id, None)
                self._alerted.discard(track_id)
                continue

            # Condition A: both wrists above eye level (lower Y = higher on screen)
            eye_y = min(
                le[1] if _kp_conf(le) else 1e9,
                re[1] if _kp_conf(re) else 1e9,
            )
            wrists_above_eyes = lw[1] < eye_y and rw[1] < eye_y

            # Condition B: wrists crossed in front of chest
            wrists_crossed = lw[0] < rw[0]  # left_wrist X < right_wrist X (when facing camera)

            gesture_active = wrists_above_eyes or wrists_crossed

            if not gesture_active:
                self._gesture_since.pop(track_id, None)
                self._alerted.discard(track_id)
                continue

            th = self.history.get(track_id)
            now = th.last.timestamp if th and th.last else 0.0

            if track_id not in self._gesture_since:
                self._gesture_since[track_id] = now
                continue

            elapsed = now - self._gesture_since[track_id]
            if elapsed >= self.hold_seconds and track_id not in self._alerted:
                self._alerted.add(track_id)
                signals.append(DetectorSignal(
                    detector_name=self.name,
                    event_type="help_gesture",
                    severity="medium",
                    confidence=0.75,
                    metadata={"track_id": track_id, "hold_seconds": round(elapsed, 1)},
                ))

        # Clean up tracks no longer visible
        gone = set(self._gesture_since) - active_ids
        for tid in gone:
            self._gesture_since.pop(tid, None)
            self._alerted.discard(tid)

        return signals


# ═══════════════════════════════════════════════════════════════════════
# 2. Chest Pain / Heart Attack  (Red Alert — 112)
# ═══════════════════════════════════════════════════════════════════════

class ChestPainDetector:
    """Wrists near sternum area AND nose shows rapid downward velocity."""

    name = "chest_pain"

    def __init__(self, history: KeypointHistory,
                 sternum_radius_frac: float = 0.15,
                 nose_velocity_threshold: float = 150.0):
        self.history = history
        self.sternum_radius_frac = sternum_radius_frac  # fraction of bbox height
        self.nose_velocity_threshold = nose_velocity_threshold  # px/s downward
        self._alerted: set[str] = set()

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        signals: list[DetectorSignal] = []

        for obs in observations:
            kp = obs.get("keypoints", {})
            track_id = obs.get("track_id", "")
            bbox = obs.get("bbox", (0, 0, 0, 0))
            body_h = max(1, bbox[3] - bbox[1])

            ls = kp.get("left_shoulder")
            rs = kp.get("right_shoulder")
            lw = kp.get("left_wrist")
            rw = kp.get("right_wrist")

            if not (_kp_conf(ls) and _kp_conf(rs)):
                continue

            sternum = _midpoint_xy(ls, rs)
            radius = body_h * self.sternum_radius_frac

            # Check: at least one wrist within sternum radius
            wrist_near = False
            for w in (lw, rw):
                if _kp_conf(w) and _dist((w[0], w[1]), sternum) < radius:
                    wrist_near = True
                    break

            if not wrist_near:
                self._alerted.discard(track_id)
                continue

            # Check: nose rapid downward velocity (positive vy = downward)
            th = self.history.get(track_id)
            if th is None:
                continue
            nose_vel = th.velocity("nose", window=0.5)
            if nose_vel is None:
                continue

            if nose_vel[1] > self.nose_velocity_threshold and track_id not in self._alerted:
                self._alerted.add(track_id)
                signals.append(DetectorSignal(
                    detector_name=self.name,
                    event_type="chest_pain",
                    severity="high",
                    confidence=0.70,
                    metadata={
                        "track_id": track_id,
                        "nose_vy": round(nose_vel[1], 1),
                    },
                ))

        return signals


# ═══════════════════════════════════════════════════════════════════════
# 3. Armed Aggression — knife  (High Priority Red Alert)
# ═══════════════════════════════════════════════════════════════════════

class ArmedAggressionDetector:
    """Knife detected near a person's wrist + high wrist velocity toward another person."""

    name = "armed_aggression"
    KNIFE_CLASS_ID = 43  # COCO class

    def __init__(self, history: KeypointHistory,
                 wrist_speed_threshold: float = 300.0,
                 knife_wrist_radius: float = 80.0):
        self.history = history
        self.wrist_speed_threshold = wrist_speed_threshold  # px/s
        self.knife_wrist_radius = knife_wrist_radius  # px
        self._alerted: set[str] = set()

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        signals: list[DetectorSignal] = []

        # Separate persons and object detections
        persons = [o for o in observations if "keypoints" in o and o.get("keypoints")]
        detected_objects = [o for o in observations if o.get("object_class_id") is not None]

        # Find knife detections
        knives = [o for o in detected_objects if o.get("object_class_id") == self.KNIFE_CLASS_ID]
        if not knives:
            self._alerted.clear()
            return signals

        for person in persons:
            kp = person.get("keypoints", {})
            track_id = person.get("track_id", "")
            lw = kp.get("left_wrist")
            rw = kp.get("right_wrist")

            # Check if any knife is near a wrist
            knife_near_wrist = False
            for knife in knives:
                kb = knife.get("bbox", (0, 0, 0, 0))
                knife_center = ((kb[0] + kb[2]) / 2, (kb[1] + kb[3]) / 2)
                for w in (lw, rw):
                    if _kp_conf(w) and _dist((w[0], w[1]), knife_center) < self.knife_wrist_radius:
                        knife_near_wrist = True
                        break
                if knife_near_wrist:
                    break

            if not knife_near_wrist:
                continue

            # Check high wrist velocity
            th = self.history.get(track_id)
            if th is None:
                continue
            for wrist_name in ("left_wrist", "right_wrist"):
                vel = th.velocity(wrist_name, window=0.3)
                if vel is None:
                    continue
                speed = math.hypot(vel[0], vel[1])
                if speed < self.wrist_speed_threshold:
                    continue

                # Check if motion is toward another person
                wrist_kp = kp.get(wrist_name)
                if not _kp_conf(wrist_kp):
                    continue
                for other in persons:
                    if other.get("track_id") == track_id:
                        continue
                    other_bbox = other.get("bbox", (0, 0, 0, 0))
                    other_center = ((other_bbox[0] + other_bbox[2]) / 2,
                                    (other_bbox[1] + other_bbox[3]) / 2)
                    # Direction from wrist to other person
                    dx_to = other_center[0] - wrist_kp[0]
                    dy_to = other_center[1] - wrist_kp[1]
                    # Dot product with velocity direction
                    dot = vel[0] * dx_to + vel[1] * dy_to
                    if dot > 0 and track_id not in self._alerted:
                        self._alerted.add(track_id)
                        signals.append(DetectorSignal(
                            detector_name=self.name,
                            event_type="armed_aggression",
                            severity="critical",
                            confidence=0.65,
                            metadata={
                                "attacker_track_id": track_id,
                                "target_track_id": other.get("track_id"),
                                "wrist_speed": round(speed, 1),
                            },
                        ))
                        break

        return signals


# ═══════════════════════════════════════════════════════════════════════
# 6. Stroke / Disorientation  (Red Alert — 112)
# ═══════════════════════════════════════════════════════════════════════

class StrokeDetector:
    """Erratic hip trajectory (zigzag) over 10s followed by loss of verticality."""

    name = "stroke"

    def __init__(self, history: KeypointHistory,
                 zigzag_threshold: float = 35.0,
                 trajectory_window: float = 10.0):
        self.history = history
        self.zigzag_threshold = zigzag_threshold  # degrees avg angle change
        self.trajectory_window = trajectory_window
        self._alerted: set[str] = set()

    def detect(self, frame, observations: list[dict]) -> list[DetectorSignal]:
        signals: list[DetectorSignal] = []

        for obs in observations:
            track_id = obs.get("track_id", "")
            posture = obs.get("posture", "standing")

            th = self.history.get(track_id)
            if th is None:
                continue

            # Need enough history
            positions = th.positions("left_hip", self.trajectory_window)
            if len(positions) < 10:
                continue

            zigzag = th.zigzag_variance("left_hip", self.trajectory_window)

            # Trigger: high zigzag variance + person is now laying
            if (zigzag >= self.zigzag_threshold
                    and posture == "laying"
                    and track_id not in self._alerted):
                self._alerted.add(track_id)
                signals.append(DetectorSignal(
                    detector_name=self.name,
                    event_type="stroke_disorientation",
                    severity="high",
                    confidence=0.60,
                    metadata={
                        "track_id": track_id,
                        "zigzag_variance": round(zigzag, 1),
                        "posture": posture,
                    },
                ))

        return signals
