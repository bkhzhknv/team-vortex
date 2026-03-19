from __future__ import annotations

from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


@dataclass(slots=True)
class Incident:
    incident_id: str
    incident_type: str
    severity: str
    source_id: str
    timestamp_utc: str
    location_label: str
    person_track_id: str
    confidence: float
    status: str
    dwell_seconds: float
    bbox: dict[str, float | int]
    keypoints_summary: dict[str, Any]
    frame_ref: str
    privacy_mode: str
    metadata: dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "Incident":
        required = {
            "incident_id",
            "incident_type",
            "severity",
            "source_id",
            "timestamp_utc",
            "location_label",
            "person_track_id",
            "confidence",
            "status",
            "dwell_seconds",
            "bbox",
            "keypoints_summary",
            "frame_ref",
            "privacy_mode",
        }
        missing = sorted(required.difference(payload))
        if missing:
            raise ValueError(f"missing incident fields: {', '.join(missing)}")
        return cls(
            incident_id=str(payload["incident_id"]),
            incident_type=str(payload["incident_type"]),
            severity=str(payload["severity"]),
            source_id=str(payload["source_id"]),
            timestamp_utc=str(payload["timestamp_utc"]),
            location_label=str(payload["location_label"]),
            person_track_id=str(payload["person_track_id"]),
            confidence=float(payload["confidence"]),
            status=str(payload["status"]),
            dwell_seconds=float(payload["dwell_seconds"]),
            bbox=dict(payload["bbox"]),
            keypoints_summary=dict(payload["keypoints_summary"]),
            frame_ref=str(payload["frame_ref"]),
            privacy_mode=str(payload["privacy_mode"]),
            metadata=dict(payload.get("metadata", {})),
        )


@dataclass(slots=True)
class VolunteerAction:
    incident_id: str
    action: str
    user_id: int
    username: str
    timestamp_utc: str

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "VolunteerAction":
        required = {"incident_id", "action", "user_id", "username", "timestamp_utc"}
        missing = sorted(required.difference(payload))
        if missing:
            raise ValueError(f"missing volunteer fields: {', '.join(missing)}")
        return cls(
            incident_id=str(payload["incident_id"]),
            action=str(payload["action"]),
            user_id=int(payload["user_id"]),
            username=str(payload["username"]),
            timestamp_utc=str(payload["timestamp_utc"]),
        )
