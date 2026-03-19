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
from vision.emergency_detectors import (
    ArmedAggressionDetector,
    ChestPainDetector,
    HelpGestureDetector,
    StrokeDetector,
)
from vision.fall import FallTracker, estimate_posture
from vision.keypoint_history import KeypointHistory
from vision.privacy import blur_head_region

# ── Color palette ──────────────────────────────────────────────────────
COLOR_GREEN = (0, 220, 80)
COLOR_RED = (0, 0, 240)
COLOR_ORANGE = (0, 140, 255)
COLOR_YELLOW = (0, 230, 255)
COLOR_WHITE = (255, 255, 255)
COLOR_BLACK = (0, 0, 0)
COLOR_ALERT_BG = (0, 0, 180)

SEVERITY_COLORS = {
    "critical": (0, 0, 255),
    "high": (0, 0, 220),
    "medium": (0, 180, 255),
    "low": (0, 200, 100),
}


@dataclass(slots=True)
class VisionArgs:
    source: str
    source_id: str
    location_label: str
    model_name: str
    object_model_name: str
    confidence_threshold: float
    dwell_threshold_seconds: float


class VisionPipeline:
    def __init__(self, args: VisionArgs):
        self.args = args
        self.settings = load_settings()
        self.pose_model = YOLO(args.model_name)
        self.object_model = YOLO(args.object_model_name)
        self.fall_tracker = FallTracker(args.dwell_threshold_seconds)
        self.kp_history = KeypointHistory(max_len=90, stale_seconds=5.0)
        self.registry = DetectorRegistry()
        self.preview_dir = Path(__file__).resolve().parent / "artifacts"
        self.preview_dir.mkdir(parents=True, exist_ok=True)

        # Register emergency detectors
        self.registry.register(HelpGestureDetector(self.kp_history))
        self.registry.register(ChestPainDetector(self.kp_history))
        self.registry.register(ArmedAggressionDetector(self.kp_history))
        self.registry.register(StrokeDetector(self.kp_history))

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

        # ── Pose model (persons only) ─────────────────────────────────
        pose_results = self.pose_model.track(
            frame, persist=True, verbose=False, classes=[0],
            conf=self.args.confidence_threshold,
        )

        # ── Object detection model (all COCO classes) ─────────────────
        obj_results = self.object_model(frame, verbose=False, conf=0.35)

        if not pose_results:
            return frame, []
        result = pose_results[0]
        rendered = frame.copy()
        observations = []
        incidents: list[Incident] = []
        boxes = getattr(result, "boxes", None)
        keypoints = getattr(result, "keypoints", None)
        if boxes is None or keypoints is None:
            return rendered, incidents

        # ── Add object detections to observations ─────────────────────
        if obj_results:
            obj_result = obj_results[0]
            obj_boxes = getattr(obj_result, "boxes", None)
            if obj_boxes is not None:
                for ob in obj_boxes:
                    cls_id = int(ob.cls[0].item()) if ob.cls is not None else -1
                    if cls_id == 0:
                        continue  # skip person class, handled by pose model
                    obj_bbox = tuple(int(v) for v in ob.xyxy[0].tolist())
                    obj_conf = float(ob.conf[0].item()) if ob.conf is not None else 0.0
                    observations.append({
                        "object_class_id": cls_id,
                        "bbox": obj_bbox,
                        "confidence": obj_conf,
                        "track_id": None,
                    })

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

            # Feed keypoint history
            self.kp_history.update(track_id, now, named_keypoints)

            rendered = blur_head_region(rendered, bbox, named_keypoints)

            # ── Color-coded bounding box ──────────────────────────────
            box_color = COLOR_RED if posture == "laying" else COLOR_GREEN
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

            label_y = max(35, bbox[1] - 15)
            (tw, th), _ = cv2.getTextSize(status_text, cv2.FONT_HERSHEY_SIMPLEX, 0.75, 2)
            cv2.rectangle(rendered, (bbox[0], label_y - th - 8), (bbox[0] + tw + 8, label_y + 4), COLOR_BLACK, -1)
            cv2.putText(rendered, status_text, (bbox[0] + 4, label_y),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.75, label_color, 2)

            cv2.putText(rendered, f"ID:{track_id}  conf:{confidence:.2f}",
                        (bbox[0], bbox[3] + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, COLOR_WHITE, 1)

            observations.append({
                "track_id": track_id,
                "bbox": bbox,
                "keypoints": named_keypoints,
                "posture": posture,
                "confidence": confidence,
            })
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

        # ── Emergency detector plugins ────────────────────────────────
        extra_signals = self.registry.detect(rendered, observations)
        for signal in extra_signals:
            alert_triggered = True
            preview_path = self.preview_dir / f"{uuid.uuid4().hex}.jpg"
            cv2.imwrite(str(preview_path), rendered)
            incidents.append(
                Incident(
                    incident_id=uuid.uuid4().hex,
                    incident_type=signal.event_type,
                    severity=signal.severity,
                    source_id=self.args.source_id,
                    timestamp_utc=utc_now_iso(),
                    location_label=self.args.location_label,
                    person_track_id=signal.metadata.get("track_id", "n/a"),
                    confidence=signal.confidence,
                    status="open",
                    dwell_seconds=0.0,
                    bbox={},
                    keypoints_summary={},
                    frame_ref=str(preview_path),
                    privacy_mode="head_blur",
                    metadata=signal.metadata | {"detector": signal.detector_name},
                )
            )

        # ── Top-of-frame alert banner ─────────────────────────────────
        if alert_triggered:
            self._draw_alert_banner(rendered, incidents)

        # Cleanup stale tracks
        self.kp_history.cleanup(now)

        return rendered, incidents

    def _draw_alert_banner(self, frame: np.ndarray, incidents: list[Incident]) -> None:
        h, w = frame.shape[:2]
        banner_h = 48
        overlay = frame.copy()
        # Pick highest severity color
        worst = "low"
        for inc in incidents:
            if inc.severity == "critical":
                worst = "critical"
                break
            if inc.severity == "high":
                worst = "high"
            elif inc.severity == "medium" and worst == "low":
                worst = "medium"
        bg = SEVERITY_COLORS.get(worst, COLOR_ALERT_BG)
        cv2.rectangle(overlay, (0, 0), (w, banner_h), bg, -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        types = ", ".join(sorted({inc.incident_type.replace("_", " ").upper() for inc in incidents}))
        alert_text = f"ALERT: {types}"
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
            "nose", "left_eye", "right_eye", "left_ear", "right_ear",
            "left_shoulder", "right_shoulder", "left_elbow", "right_elbow",
            "left_wrist", "right_wrist", "left_hip", "right_hip",
            "left_knee", "right_knee", "left_ankle", "right_ankle",
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
    parser.add_argument("--object-model-name", default="yolov8n.pt")
    parser.add_argument("--confidence-threshold", type=float, default=0.35)
    parser.add_argument("--dwell-threshold-seconds", type=float, default=10.0)
    args = parser.parse_args()
    return VisionArgs(
        source=args.source,
        source_id=args.source_id,
        location_label=args.location_label,
        model_name=args.model_name,
        object_model_name=args.object_model_name,
        confidence_threshold=args.confidence_threshold,
        dwell_threshold_seconds=args.dwell_threshold_seconds,
    )
