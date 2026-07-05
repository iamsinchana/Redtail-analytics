"""
YOLOv8 person detector using the Ultralytics library.
Filters detections to class 0 (person) only.
"""

from __future__ import annotations

import logging
from typing import Optional

import numpy as np
import supervision as sv

logger = logging.getLogger(__name__)


class PersonDetector:
    """Wraps a YOLOv8 model for person-only detection."""

    PERSON_CLASS_ID = 0

    def __init__(
        self,
        model_path: str = "yolov8n.pt",
        confidence: float = 0.35,
        iou_threshold: float = 0.45,
        device: str = "cpu",
    ) -> None:
        self._model_path = model_path
        self._confidence = confidence
        self._iou_threshold = iou_threshold
        self._device = device
        self._model = None
        self._loaded = False

    # ── Lifecycle ────────────────────────────────────────────────────────

    def load(self) -> None:
        """Load the YOLOv8 model. Safe to call multiple times."""
        if self._loaded:
            return
        try:
            from ultralytics import YOLO

            logger.info("Loading YOLOv8 model from %s on %s …", self._model_path, self._device)
            self._model = YOLO(self._model_path)
            # Warm-up with a dummy frame
            dummy = np.zeros((480, 640, 3), dtype=np.uint8)
            self._model.predict(
                dummy,
                conf=self._confidence,
                iou=self._iou_threshold,
                device=self._device,
                verbose=False,
            )
            self._loaded = True
            logger.info("YOLOv8 model loaded successfully")
        except Exception:
            logger.exception("Failed to load YOLOv8 model")
            raise

    @property
    def is_loaded(self) -> bool:
        return self._loaded

    # ── Detection ────────────────────────────────────────────────────────

    def detect(self, frame: np.ndarray) -> sv.Detections:
        """
        Run inference on a BGR frame and return supervision Detections
        filtered to persons only.
        """
        if not self._loaded or self._model is None:
            return sv.Detections.empty()

        results = self._model.predict(
            frame,
            conf=self._confidence,
            iou=self._iou_threshold,
            device=self._device,
            verbose=False,
        )

        if not results or len(results) == 0:
            return sv.Detections.empty()

        detections = sv.Detections.from_ultralytics(results[0])

        # Filter to person class only
        if detections.class_id is not None and len(detections) > 0:
            person_mask = detections.class_id == self.PERSON_CLASS_ID
            detections = detections[person_mask]

        return detections

    def detect_with_count(self, frame: np.ndarray) -> tuple[sv.Detections, int]:
        """Convenience: detect and return (detections, person_count)."""
        detections = self.detect(frame)
        return detections, len(detections)
