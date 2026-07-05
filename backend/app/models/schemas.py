"""
Pydantic models (schemas) for API requests and responses.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


# ── Enumerations ─────────────────────────────────────────────────────────────


class EventType(str, Enum):
    PERSON_ENTERED = "person_entered"
    PERSON_EXITED = "person_exited"
    CROWD_DETECTED = "crowd_detected"
    CROWD_CLEARED = "crowd_cleared"
    ZONE_INTRUSION = "zone_intrusion"
    ZONE_CLEARED = "zone_cleared"


class VideoSourceType(str, Enum):
    FILE = "file"
    RTSP = "rtsp"
    WEBCAM = "webcam"
    DEMO = "demo"


# ── Analytics ────────────────────────────────────────────────────────────────


class AnalyticsSnapshot(BaseModel):
    """Real-time analytics data pushed to clients."""

    timestamp: datetime = Field(default_factory=datetime.utcnow)
    total_persons: int = 0
    persons_in: int = 0
    persons_out: int = 0
    crowd_detected: bool = False
    zone_intrusions: int = 0
    fps: float = 0.0
    active_tracks: int = 0
    frame_number: int = 0


class AnalyticsHistory(BaseModel):
    """Wrapper for historical analytics data."""

    snapshots: list[AnalyticsSnapshot] = Field(default_factory=list)


# ── Events ───────────────────────────────────────────────────────────────────


class AnalyticsEvent(BaseModel):
    """A single analytics event / alert."""

    id: str
    event_type: EventType
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    description: str
    details: dict = Field(default_factory=dict)


class EventList(BaseModel):
    """Paginated list of events."""

    events: list[AnalyticsEvent] = Field(default_factory=list)
    total: int = 0


# ── Zones ────────────────────────────────────────────────────────────────────


class ZonePoint(BaseModel):
    x: int
    y: int


class ZoneConfig(BaseModel):
    """Configuration for a restricted / monitored zone."""

    name: str
    polygon: list[ZonePoint] = Field(
        ..., min_length=3, description="At least 3 points define a polygon"
    )
    crowd_threshold: Optional[int] = None  # override global threshold
    enabled: bool = True


class ZoneConfigResponse(BaseModel):
    zones: list[ZoneConfig] = Field(default_factory=list)


# ── Video Source ─────────────────────────────────────────────────────────────


class VideoSourceRequest(BaseModel):
    source: str = Field(
        ..., description="File path, RTSP URL, 'webcam', or 'demo'"
    )
    source_type: VideoSourceType = VideoSourceType.FILE


class VideoSourceInfo(BaseModel):
    source: Optional[str] = None
    source_type: VideoSourceType = VideoSourceType.DEMO
    status: str = "idle"


class VideoSourceList(BaseModel):
    sources: list[VideoSourceInfo] = Field(default_factory=list)


# ── Health ───────────────────────────────────────────────────────────────────


class HealthResponse(BaseModel):
    status: str = "ok"
    version: str = "1.0.0"
    model_loaded: bool = False
    video_active: bool = False
    demo_mode: bool = True
    uptime_seconds: float = 0.0


# ── Generic ──────────────────────────────────────────────────────────────────


class MessageResponse(BaseModel):
    message: str
    success: bool = True
