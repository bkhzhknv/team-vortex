"""Per-track keypoint history buffer for velocity and trajectory calculations."""
from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field


@dataclass(slots=True)
class Snapshot:
    timestamp: float
    keypoints: dict[str, tuple[float, float, float]]  # name -> (x, y, conf)


class TrackHistory:
    """Ring buffer of recent keypoint snapshots for one tracked person."""

    __slots__ = ("snapshots", "max_len", "extras")

    def __init__(self, max_len: int = 90):
        self.max_len = max_len
        self.snapshots: deque[Snapshot] = deque(maxlen=max_len)
        self.extras: dict[str, float] = {}  # per-detector timers, e.g. "help_since"

    def add(self, timestamp: float, keypoints: dict[str, tuple[float, float, float]]) -> None:
        self.snapshots.append(Snapshot(timestamp=timestamp, keypoints=keypoints))

    @property
    def last(self) -> Snapshot | None:
        return self.snapshots[-1] if self.snapshots else None

    def velocity(self, kp_name: str, window: float = 0.3) -> tuple[float, float] | None:
        """Return (vx, vy) in pixels/second for *kp_name* over the last *window* seconds.

        Returns None if insufficient data or low confidence.
        """
        if len(self.snapshots) < 2:
            return None
        latest = self.snapshots[-1]
        cutoff = latest.timestamp - window
        # Find the oldest snapshot within the window
        older = None
        for snap in self.snapshots:
            if snap.timestamp >= cutoff:
                older = snap
                break
        if older is None or older is latest:
            return None
        kp_now = latest.keypoints.get(kp_name)
        kp_old = older.keypoints.get(kp_name)
        if kp_now is None or kp_old is None or kp_now[2] < 0.2 or kp_old[2] < 0.2:
            return None
        dt = latest.timestamp - older.timestamp
        if dt < 0.01:
            return None
        return ((kp_now[0] - kp_old[0]) / dt, (kp_now[1] - kp_old[1]) / dt)

    def positions(self, kp_name: str, window: float) -> list[tuple[float, float, float]]:
        """Return list of (x, y, timestamp) for *kp_name* within the time window."""
        if not self.snapshots:
            return []
        cutoff = self.snapshots[-1].timestamp - window
        result = []
        for snap in self.snapshots:
            if snap.timestamp < cutoff:
                continue
            kp = snap.keypoints.get(kp_name)
            if kp is not None and kp[2] >= 0.2:
                result.append((kp[0], kp[1], snap.timestamp))
        return result

    def zigzag_variance(self, kp_name: str, window: float = 10.0) -> float:
        """Measure directional change variance (how 'zigzag' the path is).

        Returns the average absolute angle change between consecutive direction
        vectors, in degrees.  0 = straight line, high = erratic.
        """
        pts = self.positions(kp_name, window)
        if len(pts) < 3:
            return 0.0
        angles = []
        for i in range(1, len(pts) - 1):
            dx1 = pts[i][0] - pts[i - 1][0]
            dy1 = pts[i][1] - pts[i - 1][1]
            dx2 = pts[i + 1][0] - pts[i][0]
            dy2 = pts[i + 1][1] - pts[i][1]
            a1 = math.atan2(dy1, dx1)
            a2 = math.atan2(dy2, dx2)
            diff = abs(a2 - a1)
            if diff > math.pi:
                diff = 2 * math.pi - diff
            angles.append(math.degrees(diff))
        return sum(angles) / len(angles) if angles else 0.0


class KeypointHistory:
    """Manages TrackHistory instances for all tracked persons."""

    def __init__(self, max_len: int = 90, stale_seconds: float = 5.0):
        self.tracks: dict[str, TrackHistory] = {}
        self.max_len = max_len
        self.stale_seconds = stale_seconds

    def update(self, track_id: str, timestamp: float,
               keypoints: dict[str, tuple[float, float, float]]) -> TrackHistory:
        if track_id not in self.tracks:
            self.tracks[track_id] = TrackHistory(max_len=self.max_len)
        hist = self.tracks[track_id]
        hist.add(timestamp, keypoints)
        return hist

    def get(self, track_id: str) -> TrackHistory | None:
        return self.tracks.get(track_id)

    def cleanup(self, current_time: float) -> None:
        """Remove tracks not updated recently."""
        stale = [
            tid for tid, th in self.tracks.items()
            if th.last is not None and (current_time - th.last.timestamp) > self.stale_seconds
        ]
        for tid in stale:
            del self.tracks[tid]
