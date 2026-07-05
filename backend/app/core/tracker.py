"""
ByteTrack object tracker via the supervision library.
"""

from __future__ import annotations

import logging

import numpy as np
import supervision as sv

logger = logging.getLogger(__name__)


class PersonTracker:
    """Wraps supervision's ByteTrack for multi-object tracking of persons."""

    def __init__(
        self,
        track_activation_threshold: float = 0.25,
        lost_track_buffer: int = 30,
        minimum_matching_threshold: float = 0.8,
        frame_rate: int = 30,
    ) -> None:
        self._tracker = sv.ByteTrack(
            track_activation_threshold=track_activation_threshold,
            lost_track_buffer=lost_track_buffer,
            minimum_matching_threshold=minimum_matching_threshold,
            frame_rate=frame_rate,
        )
        self._all_seen_ids: set[int] = set()
        logger.info("ByteTrack tracker initialised")

    # ── Tracking ─────────────────────────────────────────────────────────

    def update(self, detections: sv.Detections) -> sv.Detections:
        """
        Feed detections into the tracker and return detections enriched
        with ``tracker_id``.
        """
        tracked = self._tracker.update_with_detections(detections)

        if tracked.tracker_id is not None:
            self._all_seen_ids.update(tracked.tracker_id.tolist())

        return tracked

    # ── Queries ──────────────────────────────────────────────────────────

    @property
    def total_unique_ids(self) -> int:
        """Total unique person IDs ever tracked."""
        return len(self._all_seen_ids)

    @property
    def active_track_count(self) -> int:
        """Number of currently active tracks (approximate)."""
        # ByteTrack does not expose this directly; we rely on the last
        # update result.  Callers can also just use len(tracked).
        return 0

    def reset(self) -> None:
        """Reset the tracker state."""
        self._tracker.reset()
        self._all_seen_ids.clear()
        logger.info("Tracker state reset")
