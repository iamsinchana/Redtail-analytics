"""
Main video processing pipeline.

Runs in a background thread to avoid blocking the FastAPI event loop.
Pushes annotated frames and analytics snapshots to asyncio queues for
consumption by WebSocket endpoints.
"""

from __future__ import annotations

import asyncio
import base64
import logging
import math
import random
import threading
import time
from datetime import datetime
from typing import Optional

import cv2
import numpy as np

from app.config import settings
from app.core.analytics import AnalyticsEngine
from app.core.detector import PersonDetector
from app.core.tracker import PersonTracker
from app.models.schemas import AnalyticsSnapshot, VideoSourceType
from app.utils.drawing import FrameAnnotator

logger = logging.getLogger(__name__)


class VideoProcessor:
    """
    Orchestrates detection → tracking → analytics → annotation in a
    background thread.  Provides asyncio queues for WebSocket consumers.
    """

    def __init__(self) -> None:
        # ── Components ───────────────────────────────────────────────────
        self._detector = PersonDetector(
            model_path=settings.MODEL_PATH,
            confidence=settings.CONFIDENCE_THRESHOLD,
            iou_threshold=settings.IOU_THRESHOLD,
            device=settings.DEVICE,
        )
        self._tracker = PersonTracker(frame_rate=settings.MAX_FPS)
        self._analytics = AnalyticsEngine(
            frame_width=settings.FRAME_WIDTH,
            frame_height=settings.FRAME_HEIGHT,
            crowd_threshold=settings.CROWD_THRESHOLD,
            line_y_ratio=settings.LINE_POSITION_Y_RATIO,
            max_events=settings.MAX_EVENTS,
        )
        self._annotator = FrameAnnotator()

        # ── State ────────────────────────────────────────────────────────
        self._video_source: Optional[str] = settings.VIDEO_SOURCE
        self._source_type: VideoSourceType = VideoSourceType.DEMO
        self._cap: Optional[cv2.VideoCapture] = None
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._frame_number = 0
        self._fps: float = 0.0
        self._latest_snapshot = AnalyticsSnapshot()
        self._start_time = time.monotonic()

        # ── Async queues (set from main.py lifespan) ─────────────────────
        self._frame_queue: Optional[asyncio.Queue] = None
        self._analytics_queue: Optional[asyncio.Queue] = None
        self._loop: Optional[asyncio.AbstractEventLoop] = None

        # ── MLflow state ─────────────────────────────────────────────────
        self._last_mlflow_log: float = 0.0

    # ── Lifecycle ────────────────────────────────────────────────────────

    def initialise(self, loop: asyncio.AbstractEventLoop) -> None:
        """
        Called once during FastAPI lifespan startup.  Sets up asyncio
        queues and loads the detection model.
        """
        self._loop = loop
        self._frame_queue = asyncio.Queue(maxsize=2)
        self._analytics_queue = asyncio.Queue(maxsize=10)
        try:
            self._detector.load()
        except Exception:
            logger.warning("Model load failed – running in demo mode only")

    def start(self) -> None:
        """Start the background processing thread."""
        if self._running:
            logger.warning("Processor already running")
            return
        self._running = True
        self._start_time = time.monotonic()
        self._thread = threading.Thread(
            target=self._run_loop, name="VideoProcessor", daemon=True
        )
        self._thread.start()
        logger.info("Video processor started")

    def stop(self) -> None:
        """Signal the processing thread to stop and wait for it."""
        self._running = False
        if self._thread is not None:
            self._thread.join(timeout=5)
            self._thread = None
        self._release_capture()
        logger.info("Video processor stopped")

    # ── Video Source ─────────────────────────────────────────────────────

    def set_source(self, source: str, source_type: VideoSourceType) -> None:
        """Set a new video source; restarts processing."""
        was_running = self._running
        if was_running:
            self.stop()

        self._video_source = source
        self._source_type = source_type
        self._frame_number = 0
        self._tracker.reset()
        self._analytics.reset()

        if was_running:
            self.start()
        logger.info("Video source set to %s (%s)", source, source_type.value)

    def get_source_info(self) -> dict:
        return {
            "source": self._video_source,
            "source_type": self._source_type.value,
            "status": "running" if self._running else "idle",
        }

    # ── Accessors ────────────────────────────────────────────────────────

    @property
    def is_running(self) -> bool:
        return self._running

    @property
    def model_loaded(self) -> bool:
        return self._detector.is_loaded

    @property
    def latest_snapshot(self) -> AnalyticsSnapshot:
        return self._latest_snapshot

    @property
    def analytics_engine(self) -> AnalyticsEngine:
        return self._analytics

    @property
    def frame_queue(self) -> Optional[asyncio.Queue]:
        return self._frame_queue

    @property
    def analytics_queue(self) -> Optional[asyncio.Queue]:
        return self._analytics_queue

    @property
    def uptime(self) -> float:
        return time.monotonic() - self._start_time

    # ── Private: Main Loop ───────────────────────────────────────────────

    def _run_loop(self) -> None:
        """Background thread entry point."""
        logger.info("Processing loop started (source_type=%s)", self._source_type.value)

        if self._source_type == VideoSourceType.DEMO or self._video_source is None:
            self._run_demo_loop()
            return

        if not self._open_capture():
            logger.error("Cannot open video source – falling back to demo mode")
            self._run_demo_loop()
            return

        interval = 1.0 / max(settings.MAX_FPS, 1)
        while self._running:
            loop_start = time.monotonic()

            ret, frame = self._cap.read()  # type: ignore[union-attr]
            if not ret:
                # For files, loop from beginning
                if self._source_type == VideoSourceType.FILE:
                    self._cap.set(cv2.CAP_PROP_POS_FRAMES, 0)  # type: ignore[union-attr]
                    continue
                else:
                    logger.warning("Lost video stream")
                    time.sleep(1)
                    continue

            frame = cv2.resize(
                frame, (settings.FRAME_WIDTH, settings.FRAME_HEIGHT)
            )
            self._process_frame(frame)

            elapsed = time.monotonic() - loop_start
            sleep_time = max(0, interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

        self._release_capture()

    def _run_demo_loop(self) -> None:
        """Generate synthetic frames with simulated analytics."""
        logger.info("Running in DEMO mode (synthetic data)")
        interval = 1.0 / 15  # 15 FPS demo

        while self._running:
            loop_start = time.monotonic()

            frame = self._generate_demo_frame()
            self._frame_number += 1

            # Simulated analytics
            person_count = random.randint(0, 8)
            snapshot = AnalyticsSnapshot(
                timestamp=datetime.utcnow(),
                total_persons=person_count,
                persons_in=self._frame_number // 30,
                persons_out=self._frame_number // 45,
                crowd_detected=person_count >= settings.CROWD_THRESHOLD,
                zone_intrusions=random.randint(0, 2) if person_count > 3 else 0,
                fps=15.0,
                active_tracks=person_count,
                frame_number=self._frame_number,
            )
            self._latest_snapshot = snapshot
            self._push_to_queues(frame, snapshot)

            elapsed = time.monotonic() - loop_start
            sleep_time = max(0, interval - elapsed)
            if sleep_time > 0:
                time.sleep(sleep_time)

    def _process_frame(self, frame: np.ndarray) -> None:
        """Full pipeline: detect → track → analyse → annotate → push."""
        t0 = time.monotonic()
        self._frame_number += 1

        # Detection
        detections = self._detector.detect(frame)

        # Tracking
        tracked = self._tracker.update(detections)

        # Analytics
        snapshot = self._analytics.process(tracked, self._frame_number)

        # FPS
        elapsed = time.monotonic() - t0
        self._fps = 1.0 / elapsed if elapsed > 0 else 0.0
        snapshot.fps = round(self._fps, 1)
        self._latest_snapshot = snapshot

        # Annotation
        zone_names = [zc.name for zc in self._analytics.get_zones()]
        annotated = self._annotator.annotate(
            frame=frame,
            detections=tracked,
            line_start=self._analytics.line_start,
            line_end=self._analytics.line_end,
            persons_in=snapshot.persons_in,
            persons_out=snapshot.persons_out,
            polygon_zones=self._analytics.polygon_zones,
            zone_names=zone_names,
            fps=snapshot.fps,
            crowd_detected=snapshot.crowd_detected,
        )

        self._push_to_queues(annotated, snapshot)
        self._maybe_log_mlflow(snapshot)

    # ── Queue Helpers ────────────────────────────────────────────────────

    def _push_to_queues(
        self, frame: np.ndarray, snapshot: AnalyticsSnapshot
    ) -> None:
        """Encode frame and push both to asyncio queues (thread-safe)."""
        if self._loop is None:
            return

        # JPEG encode
        _, buf = cv2.imencode(".jpg", frame, [cv2.IMWRITE_JPEG_QUALITY, 70])
        b64 = base64.b64encode(buf.tobytes()).decode("ascii")

        # Push frame (drop old if full)
        if self._frame_queue is not None:
            try:
                self._loop.call_soon_threadsafe(
                    self._frame_queue.put_nowait, b64
                )
            except asyncio.QueueFull:
                pass  # drop frame – client is slow

        # Push analytics
        if self._analytics_queue is not None:
            try:
                self._loop.call_soon_threadsafe(
                    self._analytics_queue.put_nowait, snapshot
                )
            except asyncio.QueueFull:
                pass

    # ── Capture Helpers ──────────────────────────────────────────────────

    def _open_capture(self) -> bool:
        self._release_capture()
        source = self._video_source
        if source is None:
            return False
        if self._source_type == VideoSourceType.WEBCAM:
            source = 0  # type: ignore[assignment]
        logger.info("Opening video capture: %s", source)
        self._cap = cv2.VideoCapture(source)
        if not self._cap.isOpened():
            logger.error("Failed to open video source: %s", source)
            return False
        return True

    def _release_capture(self) -> None:
        if self._cap is not None:
            self._cap.release()
            self._cap = None

    # ── Demo Frame Generator ─────────────────────────────────────────────

    def _generate_demo_frame(self) -> np.ndarray:
        """Create a synthetic frame with moving rectangles."""
        w, h = settings.FRAME_WIDTH, settings.FRAME_HEIGHT
        frame = np.zeros((h, w, 3), dtype=np.uint8)
        frame[:] = (40, 40, 50)  # dark background

        # Draw grid
        for y in range(0, h, 40):
            cv2.line(frame, (0, y), (w, y), (55, 55, 65), 1)
        for x in range(0, w, 40):
            cv2.line(frame, (x, 0), (x, h), (55, 55, 65), 1)

        # Moving dots simulating people
        t = self._frame_number * 0.05
        num_dots = 3 + int(3 * abs(math.sin(t * 0.3)))
        for i in range(num_dots):
            cx = int(w * (0.15 + 0.7 * ((math.sin(t + i * 1.5) + 1) / 2)))
            cy = int(h * (0.2 + 0.6 * ((math.cos(t * 0.7 + i * 2.0) + 1) / 2)))
            bw, bh = 30, 60
            color = (47, 138, 255) if i % 2 == 0 else (0, 200, 255)
            cv2.rectangle(
                frame, (cx - bw // 2, cy - bh // 2), (cx + bw // 2, cy + bh // 2), color, 2
            )
            cv2.putText(
                frame,
                f"P{i + 1}",
                (cx - 8, cy + 5),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.4,
                (255, 255, 255),
                1,
            )

        # Title
        cv2.putText(
            frame,
            "REDTAIL ANALYTICS - DEMO MODE",
            (w // 2 - 170, h - 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (100, 100, 120),
            1,
        )

        # Counting line
        line_y = int(h * settings.LINE_POSITION_Y_RATIO)
        cv2.line(frame, (0, line_y), (w, line_y), (0, 255, 128), 2)

        return frame

    # ── MLflow ───────────────────────────────────────────────────────────

    def _maybe_log_mlflow(self, snapshot: AnalyticsSnapshot) -> None:
        if not settings.MLFLOW_ENABLED:
            return
        now = time.monotonic()
        if now - self._last_mlflow_log < settings.MLFLOW_LOG_INTERVAL_SECONDS:
            return
        self._last_mlflow_log = now
        try:
            import mlflow

            mlflow.set_tracking_uri(settings.MLFLOW_TRACKING_URI)
            mlflow.set_experiment(settings.MLFLOW_EXPERIMENT_NAME)
            with mlflow.start_run(nested=True):
                mlflow.log_metrics(
                    {
                        "fps": snapshot.fps,
                        "person_count": snapshot.total_persons,
                        "persons_in": snapshot.persons_in,
                        "persons_out": snapshot.persons_out,
                        "active_tracks": snapshot.active_tracks,
                        "zone_intrusions": snapshot.zone_intrusions,
                    },
                    step=snapshot.frame_number,
                )
        except Exception:
            logger.debug("MLflow logging failed", exc_info=True)


# ── Singleton ────────────────────────────────────────────────────────────────
video_processor = VideoProcessor()
