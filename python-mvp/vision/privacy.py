from __future__ import annotations

from typing import Iterable

import cv2
import numpy as np


def compute_head_box(
    frame_shape: tuple[int, ...],
    bbox: tuple[int, int, int, int],
    keypoints: dict[str, tuple[float, float, float]],
) -> tuple[int, int, int, int]:
    frame_height, frame_width = frame_shape[:2]
    x1, y1, x2, y2 = bbox
    face_points = [
        point
        for point in _collect_points(
            keypoints,
            ["nose", "left_eye", "right_eye", "left_ear", "right_ear"],
        )
        if point[2] >= 0.2
    ]
    if face_points:
        xs = [point[0] for point in face_points]
        ys = [point[1] for point in face_points]
        width = max(xs) - min(xs)
        height = max(ys) - min(ys)
        padding_x = max(18, int(width * 0.6))
        padding_y = max(20, int(height * 0.9))
        hx1 = int(min(xs) - padding_x)
        hy1 = int(min(ys) - padding_y)
        hx2 = int(max(xs) + padding_x)
        hy2 = int(max(ys) + padding_y)
    else:
        body_width = max(1, x2 - x1)
        body_height = max(1, y2 - y1)
        head_width = int(body_width * 0.55)
        head_height = int(body_height * 0.28)
        center_x = x1 + body_width // 2
        hx1 = center_x - head_width // 2
        hx2 = center_x + head_width // 2
        hy1 = y1
        hy2 = y1 + head_height
    return (
        max(0, hx1),
        max(0, hy1),
        min(frame_width, hx2),
        min(frame_height, hy2),
    )


def blur_head_region(
    frame: np.ndarray,
    bbox: tuple[int, int, int, int],
    keypoints: dict[str, tuple[float, float, float]],
) -> np.ndarray:
    hx1, hy1, hx2, hy2 = compute_head_box(frame.shape, bbox, keypoints)
    if hx2 <= hx1 or hy2 <= hy1:
        return frame
    output = frame.copy()
    roi = output[hy1:hy2, hx1:hx2]
    output[hy1:hy2, hx1:hx2] = cv2.GaussianBlur(roi, (31, 31), 0)
    return output


def _collect_points(
    keypoints: dict[str, tuple[float, float, float]],
    names: Iterable[str],
) -> list[tuple[float, float, float]]:
    return [keypoints[name] for name in names if name in keypoints]
