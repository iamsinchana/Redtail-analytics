"""
REST API endpoints for Redtail-Analytics.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException, UploadFile, File

from app.config import settings
from app.core.video_processor import video_processor
from app.models.schemas import (
    AnalyticsSnapshot,
    EventList,
    HealthResponse,
    MessageResponse,
    VideoSourceInfo,
    VideoSourceList,
    VideoSourceRequest,
    VideoSourceType,
    ZoneConfig,
    ZoneConfigResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api", tags=["api"])


# ── Health ───────────────────────────────────────────────────────────────────


@router.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    """Return system health information."""
    return HealthResponse(
        status="ok",
        version=settings.APP_VERSION,
        model_loaded=video_processor.model_loaded,
        video_active=video_processor.is_running,
        demo_mode=video_processor.get_source_info()["source_type"]
        == VideoSourceType.DEMO.value,
        uptime_seconds=round(video_processor.uptime, 2),
    )


# ── Analytics ────────────────────────────────────────────────────────────────


@router.get("/analytics", response_model=AnalyticsSnapshot)
async def get_analytics() -> AnalyticsSnapshot:
    """Return the latest analytics snapshot."""
    return video_processor.latest_snapshot


# ── Events ───────────────────────────────────────────────────────────────────


@router.get("/events", response_model=EventList)
async def get_events(limit: int = 50) -> EventList:
    """Return recent analytics events / alerts."""
    events = video_processor.analytics_engine.get_events(limit=limit)
    return EventList(events=events, total=len(events))


# ── Zones ────────────────────────────────────────────────────────────────────


@router.post("/zones", response_model=MessageResponse)
async def set_zones(zones: list[ZoneConfig]) -> MessageResponse:
    """Configure restricted / monitored zones."""
    try:
        video_processor.analytics_engine.set_zones(zones)
        return MessageResponse(
            message=f"{len(zones)} zone(s) configured", success=True
        )
    except Exception as exc:
        logger.exception("Failed to set zones")
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/zones", response_model=ZoneConfigResponse)
async def get_zones() -> ZoneConfigResponse:
    """Return currently configured zones."""
    zones = video_processor.analytics_engine.get_zones()
    return ZoneConfigResponse(zones=zones)


# ── Video Source ─────────────────────────────────────────────────────────────


@router.post("/video/source", response_model=MessageResponse)
async def set_video_source(request: VideoSourceRequest) -> MessageResponse:
    """Set the active video source."""
    source = request.source
    source_type = request.source_type

    # Validate source
    if source_type == VideoSourceType.FILE:
        if not Path(source).exists():
            raise HTTPException(
                status_code=404, detail=f"Video file not found: {source}"
            )
    elif source_type == VideoSourceType.RTSP:
        if not source.startswith("rtsp://"):
            raise HTTPException(
                status_code=400, detail="RTSP URL must start with rtsp://"
            )
    elif source_type == VideoSourceType.WEBCAM:
        source = "0"
    elif source_type == VideoSourceType.DEMO:
        source = None  # type: ignore[assignment]

    video_processor.set_source(source, source_type)
    video_processor.start()

    return MessageResponse(
        message=f"Video source set to {source_type.value}: {source}",
        success=True,
    )


@router.get("/video/sources", response_model=VideoSourceList)
async def list_video_sources() -> VideoSourceList:
    """List available / configured video sources."""
    sources: list[VideoSourceInfo] = []

    # Current active source
    info = video_processor.get_source_info()
    sources.append(
        VideoSourceInfo(
            source=info["source"],
            source_type=VideoSourceType(info["source_type"]),
            status=info["status"],
        )
    )

    # Uploaded files
    upload_dir = settings.ensure_upload_dir()
    for p in upload_dir.glob("*"):
        if p.suffix.lower() in {".mp4", ".avi", ".mkv", ".mov", ".webm"}:
            sources.append(
                VideoSourceInfo(
                    source=str(p),
                    source_type=VideoSourceType.FILE,
                    status="available",
                )
            )

    # Demo always available
    sources.append(
        VideoSourceInfo(
            source=None,
            source_type=VideoSourceType.DEMO,
            status="available",
        )
    )

    return VideoSourceList(sources=sources)


# ── File Upload ──────────────────────────────────────────────────────────────


@router.post("/video/upload", response_model=MessageResponse)
async def upload_video(file: UploadFile = File(...)) -> MessageResponse:
    """Upload a video file for processing."""
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided")

    allowed = {".mp4", ".avi", ".mkv", ".mov", ".webm"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported format '{ext}'. Allowed: {allowed}",
        )

    upload_dir = settings.ensure_upload_dir()
    dest = upload_dir / file.filename
    try:
        contents = await file.read()
        dest.write_bytes(contents)
        logger.info("Uploaded video saved to %s (%d bytes)", dest, len(contents))
    except Exception as exc:
        logger.exception("Upload failed")
        raise HTTPException(status_code=500, detail=str(exc))

    return MessageResponse(
        message=f"Uploaded {file.filename} ({len(contents)} bytes) to {dest}",
        success=True,
    )
