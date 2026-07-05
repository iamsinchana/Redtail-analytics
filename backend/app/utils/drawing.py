"""
Frame annotation utilities using the supervision library.
Produces clean, production-quality visualisations.
"""

from __future__ import annotations

import logging
from typing import Optional

import cv2
import numpy as np
import supervision as sv

logger = logging.getLogger(__name__)


class FrameAnnotator:
    """
    Annotates frames with bounding boxes, labels, counting line,
    and polygon zones using supervision annotators.
    """

    # ── Colour palette ───────────────────────────────────────────────────
    BOX_COLOR = sv.Color(47, 138, 255)       # blue
    LABEL_COLOR = sv.Color(47, 138, 255)
    LINE_COLOR = sv.Color(0, 255, 128)       # green
    ZONE_COLOR = sv.Color(255, 80, 80)       # red
    ZONE_FILL_COLOR = sv.Color(255, 80, 80)
    TEXT_COLOR = sv.Color(255, 255, 255)

    def __init__(self) -> None:
        self._box_annotator = sv.BoxAnnotator(
            color=self.BOX_COLOR,
            thickness=2,
        )
        self._label_annotator = sv.LabelAnnotator(
            color=self.LABEL_COLOR,
            text_color=self.TEXT_COLOR,
            text_scale=0.5,
            text_thickness=1,
        )
        logger.info("FrameAnnotator initialised")

    # ── Public API ───────────────────────────────────────────────────────

    def annotate(
        self,
        frame: np.ndarray,
        detections: sv.Detections,
        line_start: Optional[sv.Point] = None,
        line_end: Optional[sv.Point] = None,
        persons_in: int = 0,
        persons_out: int = 0,
        polygon_zones: Optional[list[sv.PolygonZone]] = None,
        zone_names: Optional[list[str]] = None,
        fps: float = 0.0,
        crowd_detected: bool = False,
    ) -> np.ndarray:
        """
        Draw all annotations on a copy of the frame and return it.
        """
        annotated = frame.copy()

        # ── Bounding boxes ───────────────────────────────────────────────
        if len(detections) > 0:
            annotated = self._box_annotator.annotate(
                scene=annotated, detections=detections
            )
            labels = self._build_labels(detections)
            annotated = self._label_annotator.annotate(
                scene=annotated, detections=detections, labels=labels
            )

        # ── Counting line ────────────────────────────────────────────────
        if line_start is not None and line_end is not None:
            cv2.line(
                annotated,
                (line_start.x, line_start.y),
                (line_end.x, line_end.y),
                (0, 255, 128),
                2,
                cv2.LINE_AA,
            )
            # In / Out counters
            h = annotated.shape[0]
            cv2.putText(
                annotated,
                f"IN: {persons_in}",
                (10, line_start.y - 15),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 255, 128),
                2,
            )
            cv2.putText(
                annotated,
                f"OUT: {persons_out}",
                (10, line_start.y + 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.6,
                (0, 200, 255),
                2,
            )

        # ── Polygon zones ───────────────────────────────────────────────
        if polygon_zones:
            for idx, pz in enumerate(polygon_zones):
                pts = pz.polygon.astype(np.int32)
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [pts], (255, 80, 80, 60))
                cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)
                cv2.polylines(annotated, [pts], True, (255, 80, 80), 2)
                if zone_names and idx < len(zone_names):
                    centroid = pts.mean(axis=0).astype(int)
                    cv2.putText(
                        annotated,
                        zone_names[idx],
                        tuple(centroid),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        0.5,
                        (255, 255, 255),
                        2,
                    )

        # ── HUD overlay ─────────────────────────────────────────────────
        self._draw_hud(annotated, len(detections), fps, crowd_detected)

        return annotated

    # ── Helpers ──────────────────────────────────────────────────────────

    @staticmethod
    def _build_labels(detections: sv.Detections) -> list[str]:
        labels: list[str] = []
        for i in range(len(detections)):
            tid = ""
            if detections.tracker_id is not None:
                tid = f"#{detections.tracker_id[i]} "
            conf = ""
            if detections.confidence is not None:
                conf = f"{detections.confidence[i]:.2f}"
            labels.append(f"{tid}Person {conf}")
        return labels

    @staticmethod
    def _draw_hud(
        frame: np.ndarray,
        person_count: int,
        fps: float,
        crowd_detected: bool,
    ) -> None:
        """Draw a heads-up display strip at the top of the frame."""
        h, w = frame.shape[:2]
        # Dark bar
        cv2.rectangle(frame, (0, 0), (w, 36), (30, 30, 30), -1)
        cv2.putText(
            frame,
            f"Persons: {person_count}",
            (10, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            1,
        )
        cv2.putText(
            frame,
            f"FPS: {fps:.1f}",
            (w - 130, 25),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (255, 255, 255),
            1,
        )
        if crowd_detected:
            cv2.putText(
                frame,
                "CROWD!",
                (w // 2 - 40, 25),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 0, 255),
                2,
            )
