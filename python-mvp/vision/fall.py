from __future__ import annotations

from dataclasses import dataclass


@dataclass(slots=True)
class FallDecision:
    track_id: str
    dwell_seconds: float


@dataclass(slots=True)
class TrackState:
    ground_since: float | None = None
    alerted: bool = False


class FallTracker:
    def __init__(self, dwell_threshold_seconds: float = 10.0):
        self.dwell_threshold_seconds = dwell_threshold_seconds
        self.states: dict[str, TrackState] = {}

    def update(self, track_id: str, posture: str, timestamp: float) -> FallDecision | None:
        state = self.states.setdefault(track_id, TrackState())
        if posture != "laying":
            state.ground_since = None
            state.alerted = False
            return None
        if state.ground_since is None:
            state.ground_since = timestamp
            state.alerted = False
            return None
        dwell_seconds = max(0.0, timestamp - state.ground_since)
        if dwell_seconds >= self.dwell_threshold_seconds and not state.alerted:
            state.alerted = True
            return FallDecision(track_id=track_id, dwell_seconds=dwell_seconds)
        return None

    def get_dwell_seconds(self, track_id: str, current_time: float) -> float:
        """Return how many seconds this track has been on the ground (0 if standing)."""
        state = self.states.get(track_id)
        if state is None or state.ground_since is None:
            return 0.0
        return max(0.0, current_time - state.ground_since)

    def is_alerted(self, track_id: str) -> bool:
        """Return True if this track already triggered an alert."""
        state = self.states.get(track_id)
        return state is not None and state.alerted


def estimate_posture(
    bbox: tuple[int, int, int, int],
    keypoints: dict[str, tuple[float, float, float]],
    frame_height: int,
) -> str:
    x1, y1, x2, y2 = bbox
    width = max(1, x2 - x1)
    height = max(1, y2 - y1)
    aspect_ratio = width / height
    center_y = (y1 + y2) / 2
    low_to_ground = center_y >= frame_height * 0.68

    # Heuristic 1: torso orientation (shoulders vs hips)
    shoulders = _midpoint(keypoints, "left_shoulder", "right_shoulder")
    hips = _midpoint(keypoints, "left_hip", "right_hip")
    torso_horizontal = False
    if shoulders and hips:
        dx = abs(shoulders[0] - hips[0])
        dy = abs(shoulders[1] - hips[1])
        torso_horizontal = dx > dy

    # Heuristic 2: ankle-to-shoulder vertical spread
    # When standing, ankles are far below shoulders; when laying, they are at similar Y
    ankles = _midpoint(keypoints, "left_ankle", "right_ankle")
    vertical_spread_small = False
    if shoulders and ankles:
        body_height = max(1, y2 - y1)
        vertical_spread = abs(ankles[1] - shoulders[1]) / body_height
        vertical_spread_small = vertical_spread < 0.35

    if (aspect_ratio >= 1.15 and low_to_ground) or (torso_horizontal and low_to_ground):
        return "laying"
    if torso_horizontal and vertical_spread_small:
        return "laying"
    return "standing"


def _midpoint(
    keypoints: dict[str, tuple[float, float, float]],
    left_name: str,
    right_name: str,
) -> tuple[float, float] | None:
    left = keypoints.get(left_name)
    right = keypoints.get(right_name)
    if left is None or right is None:
        return None
    if left[2] < 0.2 or right[2] < 0.2:
        return None
    return ((left[0] + right[0]) / 2, (left[1] + right[1]) / 2)
