from __future__ import annotations

import argparse
import uuid
from dataclasses import dataclass
from pathlib import Path
from time import time

import cv2
import numpy as np
import requests
from ultralytics import YOLO

from shared.config import load_settings
from shared.models import Incident, utc_now_iso
from vision.detectors import DetectorRegistry
from vision.fall import FallTracker, estimate_posture
from vision.privacy import blur_head_region

# ── Color palette ──────────────────────────────────────────────────────
COLOR_GREEN = (0, 220, 80)
COLOR_RED = (0, 0, 240)
COLOR_ORANGE = (0, 140, 255)
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_ALERT_BG = (0, 0, 180)


@dataclass(slots=True)
class VisionArgs:
    source: str
    source_id: str
    location_label: str
    model_name: str
    confidence_threshold: float
    dwell_threshold_seconds: float


class VisionPipeline:
    def __init__(self, args: VisionArgs):
        self.args = args
        self.settings = load_settings()
        self.model = YOLO(args.model_name)
        self.fall_tracker = FallTracker(args.dwell_threshold_seconds)
        self.registry = DetectorRegistry()
        self.preview_dir = Path(__file__).resolve().parent / "artifacts"
        self.preview_dir.mkdir(parents=True, exist_ok=True)

    def run(self) -> None:
        capture = cv2.VideoCapture(self._parse_source(self.args.source))
        if not capture.isOpened():
            raise RuntimeError(f"unable to open source: {self.args.source}")
        try:
            while True:
                ok, frame = capture.read()
                if not ok:
                    break
                rendered_frame, incidents = self.process_frame(frame)
                cv2.imshow("smart-city-safety-mvp", rendered_frame)
                for incident in incidents:
                    self.post_incident(incident)
                if cv2.waitKey(1) & 0xFF == ord("q"):
                    break
        finally:
            capture.release()
            cv2.destroyAllWindows()

    def process_frame(self, frame):
        now = time()
        results = self.model.track(frame, persist=True, verbose=False, classes=[0], conf=self.args.confidence_threshold)
        if not results:
            return frame, []
        result = results[0]
        rendered = frame.copy()
        observations = []
        incidents: list[Incident] = []
        boxes = getattr(result, "boxes", None)
        keypoints = getattr(result, "keypoints", None)
        if boxes is None or keypoints is None:
            return rendered, incidents

        alert_triggered = False

        for index, box in enumerate(boxes):
            bbox = tuple(int(value) for value in box.xyxy[0].tolist())
            track_tensor = getattr(box, "id", None)
            track_id = str(int(track_tensor.item())) if track_tensor is not None else f"track-{index}"
            confidence_tensor = getattr(box, "conf", None)
            if confidence_tensor is None:
                confidence = 0.0
            elif hasattr(confidence_tensor, "item"):
                confidence = float(confidence_tensor.item())
            else:
                confidence = float(confidence_tensor[0])
            named_keypoints = self._named_keypoints(keypoints, index)
            posture = estimate_posture(bbox, named_keypoints, frame.shape[0])
            rendered = blur_head_region(rendered, bbox, named_keypoints)

            # ── Color-coded bounding box ──────────────────────────────
            if posture == "laying":
                box_color = COLOR_RED
            else:
                box_color = COLOR_GREEN
            cv2.rectangle(rendered, (bbox[0], bbox[1]), (bbox[2], bbox[3]), box_color, 3)

            # ── Large posture label ───────────────────────────────────
            dwell = self.fall_tracker.get_dwell_seconds(track_id, now)
            already_alerted = self.fall_tracker.is_alerted(track_id)

            if posture == "laying":
                if already_alerted:
                    status_text = "LAYING DOWN - ALERT SENT!"
                    label_color = COLOR_RED
                    alert_triggered = True
                else:
                    status_text = f"LAYING DOWN  {dwell:.1f}s / {self.args.dwell_threshold_seconds:.0f}s"
                    label_color = COLOR_ORANGE if dwell < self.args.dwell_threshold_seconds * 0.7 else COLOR_RED
            else:
                status_text = "STANDING"
                label_color = COLOR_GREEN

            # Draw label background for visibility
            label_y = max(35, bbox[1] - 15)
            (tw, th), _ = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
            cv2.rectangle(rendered, (bbox[0], label_y - th - 8), (bbox[0] + tw + 8, label_y + 4), COLOR_BLACK, -1)
            cv2.putText(
                rendered,
                status_text,
                (bbox[0] + 4, label_y),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.75,
                label_color,
                2,
            )

            # ── Track ID (smaller, below box) ────────────────────────
            cv2.putText(
                rendered,
                f"ID:{track_id}  conf:{confidence:.2f}",
                (bbox[0], bbox[3] + 20),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.5,
                COLOR_WHITE,
                1,
            )

            observations.append(
                {
                    "track_id": track_id,
                    "bbox": bbox,
                    "keypoints": named_keypoints,
                    "posture": posture,
                    "confidence": confidence,
                }
            )
            decision = self.fall_tracker.update(track_id, posture, now)
            if decision is None:
                continue
            alert_triggered = True
            preview_path = self.preview_dir / f"{uuid.uuid4().hex}.jpg"
            cv2.imwrite(str(preview_path), rendered)
            incidents.append(
                Incident(
                    incident_id=uuid.uuid4().hex,
                    incident_type="fall_detected",
                    severity="high",
                    source_id=self.args.source_id,
                    timestamp_utc=utc_now_iso(),
                    location_label=self.args.location_label,
                    person_track_id=decision.track_id,
                    confidence=confidence,
                    status="open",
                    dwell_seconds=decision.dwell_seconds,
                    bbox={"x1": bbox[0], "y1": bbox[1], "x2": bbox[2], "y2": bbox[3]},
                    keypoints_summary={
                        name: [round(point[0], 2), round(point[1], 2)]
                        for name, point in named_keypoints.items()
                        if point[2] >= 0.2
                    },
                    frame_ref=str(preview_path),
                    privacy_mode="head_blur",
                    metadata={"detector": "fall", "posture": posture},
                )
            )

        # ── Top-of-frame alert banner ─────────────────────────────────
        if alert_triggered:
            self._draw_alert_banner(rendered)

        extra_signals = self.registry.detect(rendered, observations)
        for signal in extra_signals:
            incidents.append(
                Incident(
                    incident_id=uuid.uuid4().hex,
                    incident_type=signal.event_type,
                    severity=signal.severity,
                    source_id=self.args.source_id,
                    timestamp_utc=utc_now_iso(),
                    location_label=self.args.location_label,
                    person_track_id="n/a",
                    confidence=signal.confidence,
                    status="open",
                    dwell_seconds=0.0,
                    bbox={},
                    keypoints_summary={},
                    frame_ref="",
                    privacy_mode="head_blur",
                    metadata=signal.metadata | {"detector": signal.detector_name},
                )
            )
        return rendered, incidents

    def _draw_alert_banner(self, frame: np.ndarray) -> None:
        """Draw a prominent red alert banner at the top of the frame."""
        h, w = frame.shape[:2]
        banner_h = 48
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, banner_h), COLOR_ALERT_BG, -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        alert_text = "ALERT: PERSON LAYING DOWN > 10s  -  REPORT SENT TO OPERATOR & TELEGRAM"
        (tw, _), _ = cv2.getTextSize(alert_text, cv2.FONT_HERSHEY_SIMPLEX, 0.65, 2)
        text_x = max(10, (w - tw) // 2)
        cv2.putText(frame, alert_text, (text_x, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.65, COLOR_WHITE, 2)

    def post_incident(self, incident: Incident) -> None:
        if not self.settings.backend_url:
            raise RuntimeError("BACKEND_URL is required")
        response = requests.post(
            f"{self.settings.backend_url}/incident",
            json=incident.to_dict(),
            timeout=10,
        )
        response.raise_for_status()

    def _named_keypoints(self, keypoints, index: int) -> dict[str, tuple[float, float, float]]:
        names = [
            "nose",
            "left_eye",
            "right_eye",
            "left_ear",
            "right_ear",
            "left_shoulder",
            "right_shoulder",
            "left_elbow",
            "right_elbow",
            "left_wrist",
            "right_wrist",
            "left_hip",
            "right_hip",
            "left_knee",
            "right_knee",
            "left_ankle",
            "right_ankle",
        ]
        xy_points = keypoints.xy[index].tolist()
        conf_points = keypoints.conf[index].tolist() if keypoints.conf is not None else [1.0] * len(xy_points)
        return {
            name: (float(point[0]), float(point[1]), float(conf_points[i]))
            for i, (name, point) in enumerate(zip(names, xy_points))
        }

    def _parse_source(self, source: str):
        if source.isdigit():
            return int(source)
        return source


def parse_args() -> VisionArgs:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--source-id", required=True)
    parser.add_argument("--location-label", required=True)
    parser.add_argument("--model-name", default="yolov8n-pose.pt")
    parser.add_argument("--confidence-threshold", type=float, default=0.35)
    parser.add_argument("--dwell-threshold-seconds", type=float, default=10.0)
    args = parser.parse_args()
    return VisionArgs(
        source=args.source,
        source_id=args.source_id,
        location_label=args.location_label,
        model_name=args.model_name,
        confidence_threshold=args.confidence_threshold,
        dwell_threshold_seconds=args.dwell_threshold_seconds,
    )
