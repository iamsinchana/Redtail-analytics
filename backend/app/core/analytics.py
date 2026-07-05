"""
Analytics engine: people counting, crowd detection, zone intrusion.

Works with supervision's LineZone / PolygonZone for spatial analytics.
"""

from __future__ import annotations

import logging
import uuid
from collections import deque
from datetime import datetime
from threading import Lock
from typing import Optional

import numpy as np
import supervision as sv

from app.models.schemas import (
    AnalyticsEvent,
    AnalyticsSnapshot,
    EventType,
    ZoneConfig,
    ZonePoint,
)

logger = logging.getLogger(__name__)


class AnalyticsEngine:
    """
    Stateful analytics engine that processes tracked detections and
    produces counts, crowd alerts, and zone intrusion events.
    """

    def __init__(
        self,
        frame_width: int = 640,
        frame_height: int = 480,
        crowd_threshold: int = 5,
        line_y_ratio: float = 0.5,
        max_events: int = 500,
    ) -> None:
        self._frame_width = frame_width
        self._frame_height = frame_height
        self._crowd_threshold = crowd_threshold
        self._max_events = max_events
        self._lock = Lock()

        # ── Counting line (horizontal) ───────────────────────────────────
        line_y = int(frame_height * line_y_ratio)
        self._line_start = sv.Point(x=0, y=line_y)
        self._line_end = sv.Point(x=frame_width, y=line_y)
        self._line_zone = sv.LineZone(
            start=self._line_start,
            end=self._line_end,
        )

        # ── State ────────────────────────────────────────────────────────
        self._persons_in = 0
        self._persons_out = 0
        self._crowd_detected = False
        self._zone_intrusions = 0
        self._frame_number = 0
        self._events: deque[AnalyticsEvent] = deque(maxlen=max_events)

        # ── Custom zones ─────────────────────────────────────────────────
        self._zone_configs: list[ZoneConfig] = []
        self._polygon_zones: list[sv.PolygonZone] = []
        self._zone_active_flags: list[bool] = []  # per-zone intrusion state

        logger.info(
            "AnalyticsEngine initialised (line_y=%d, crowd_threshold=%d)",
            line_y,
            crowd_threshold,
        )

    # ── Zone Management ──────────────────────────────────────────────────

    def set_zones(self, zones: list[ZoneConfig]) -> None:
        """Replace all configured zones."""
        with self._lock:
            self._zone_configs = zones
            self._polygon_zones = []
            self._zone_active_flags = []
            for zc in zones:
                polygon = np.array(
                    [[p.x, p.y] for p in zc.polygon], dtype=np.int32
                )
                pz = sv.PolygonZone(
                    polygon=polygon,
                    frame_resolution_wh=(self._frame_width, self._frame_height),
                )
                self._polygon_zones.append(pz)
                self._zone_active_flags.append(False)
            logger.info("Configured %d zone(s)", len(zones))

    def get_zones(self) -> list[ZoneConfig]:
        with self._lock:
            return list(self._zone_configs)

    # ── Core Processing ──────────────────────────────────────────────────

    def process(
        self, detections: sv.Detections, frame_number: int
    ) -> AnalyticsSnapshot:
        """
        Process one frame's tracked detections and return an analytics
        snapshot.  Also emits events as side-effects.
        """
        with self._lock:
            self._frame_number = frame_number
            person_count = len(detections)

            # ── Line counting ────────────────────────────────────────────
            crossed_in, crossed_out = self._line_zone.trigger(detections)
            newly_in = int(np.sum(crossed_in)) if crossed_in is not None else 0
            newly_out = int(np.sum(crossed_out)) if crossed_out is not None else 0
            self._persons_in += newly_in
            self._persons_out += newly_out

            if newly_in > 0:
                self._emit_event(
                    EventType.PERSON_ENTERED,
                    f"{newly_in} person(s) crossed line (in)",
                    {"count": newly_in, "frame": frame_number},
                )
            if newly_out > 0:
                self._emit_event(
                    EventType.PERSON_EXITED,
                    f"{newly_out} person(s) crossed line (out)",
                    {"count": newly_out, "frame": frame_number},
                )

            # ── Crowd detection ──────────────────────────────────────────
            was_crowd = self._crowd_detected
            self._crowd_detected = person_count >= self._crowd_threshold
            if self._crowd_detected and not was_crowd:
                self._emit_event(
                    EventType.CROWD_DETECTED,
                    f"Crowd detected: {person_count} persons (threshold {self._crowd_threshold})",
                    {"count": person_count, "threshold": self._crowd_threshold},
                )
            elif not self._crowd_detected and was_crowd:
                self._emit_event(
                    EventType.CROWD_CLEARED,
                    f"Crowd cleared: {person_count} persons",
                    {"count": person_count},
                )

            # ── Zone intrusion ───────────────────────────────────────────
            zone_intrusion_count = 0
            for idx, pz in enumerate(self._polygon_zones):
                zc = self._zone_configs[idx]
                if not zc.enabled:
                    continue
                zone_mask = pz.trigger(detections)
                in_zone = int(np.sum(zone_mask)) if zone_mask is not None else 0
                was_active = self._zone_active_flags[idx]

                if in_zone > 0:
                    zone_intrusion_count += in_zone
                    if not was_active:
                        self._zone_active_flags[idx] = True
                        self._emit_event(
                            EventType.ZONE_INTRUSION,
                            f"Intrusion in zone '{zc.name}': {in_zone} person(s)",
                            {"zone": zc.name, "count": in_zone},
                        )
                else:
                    if was_active:
                        self._zone_active_flags[idx] = False
                        self._emit_event(
                            EventType.ZONE_CLEARED,
                            f"Zone '{zc.name}' cleared",
                            {"zone": zc.name},
                        )

            self._zone_intrusions = zone_intrusion_count

            active_tracks = 0
            if detections.tracker_id is not None:
                active_tracks = len(set(detections.tracker_id.tolist()))

            return AnalyticsSnapshot(
                timestamp=datetime.utcnow(),
                total_persons=person_count,
                persons_in=self._persons_in,
                persons_out=self._persons_out,
                crowd_detected=self._crowd_detected,
                zone_intrusions=self._zone_intrusions,
                active_tracks=active_tracks,
                frame_number=frame_number,
            )

    # ── Events ───────────────────────────────────────────────────────────

    def get_events(self, limit: int = 50) -> list[AnalyticsEvent]:
        with self._lock:
            items = list(self._events)
            return items[-limit:]

    def _emit_event(
        self, event_type: EventType, description: str, details: dict
    ) -> None:
        event = AnalyticsEvent(
            id=uuid.uuid4().hex[:12],
            event_type=event_type,
            timestamp=datetime.utcnow(),
            description=description,
            details=details,
        )
        self._events.append(event)
        logger.info("Event: %s – %s", event_type.value, description)

    # ── Accessors ────────────────────────────────────────────────────────

    @property
    def line_zone(self) -> sv.LineZone:
        return self._line_zone

    @property
    def polygon_zones(self) -> list[sv.PolygonZone]:
        with self._lock:
            return list(self._polygon_zones)

    @property
    def line_start(self) -> sv.Point:
        return self._line_start

    @property
    def line_end(self) -> sv.Point:
        return self._line_end

    def reset(self) -> None:
        """Reset all analytics state."""
        with self._lock:
            self._persons_in = 0
            self._persons_out = 0
            self._crowd_detected = False
            self._zone_intrusions = 0
            self._frame_number = 0
            self._events.clear()
            self._zone_active_flags = [False] * len(self._zone_active_flags)
        logger.info("Analytics state reset")
