"""
WebSocket endpoints for live frame streaming and analytics data.
"""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import datetime

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from app.core.video_processor import video_processor
from app.models.schemas import AnalyticsSnapshot

logger = logging.getLogger(__name__)

router = APIRouter()


# ── Connection Manager ───────────────────────────────────────────────────────


class ConnectionManager:
    """Manages active WebSocket connections per channel."""

    def __init__(self) -> None:
        self._feed_clients: list[WebSocket] = []
        self._analytics_clients: list[WebSocket] = []

    async def connect_feed(self, ws: WebSocket) -> None:
        await ws.accept()
        self._feed_clients.append(ws)
        logger.info("Feed WS client connected (%d total)", len(self._feed_clients))

    async def connect_analytics(self, ws: WebSocket) -> None:
        await ws.accept()
        self._analytics_clients.append(ws)
        logger.info(
            "Analytics WS client connected (%d total)",
            len(self._analytics_clients),
        )

    def disconnect_feed(self, ws: WebSocket) -> None:
        if ws in self._feed_clients:
            self._feed_clients.remove(ws)
        logger.info("Feed WS client disconnected (%d remaining)", len(self._feed_clients))

    def disconnect_analytics(self, ws: WebSocket) -> None:
        if ws in self._analytics_clients:
            self._analytics_clients.remove(ws)
        logger.info(
            "Analytics WS client disconnected (%d remaining)",
            len(self._analytics_clients),
        )

    @property
    def feed_count(self) -> int:
        return len(self._feed_clients)

    @property
    def analytics_count(self) -> int:
        return len(self._analytics_clients)


manager = ConnectionManager()


# ── WebSocket Endpoints ──────────────────────────────────────────────────────


@router.websocket("/ws/feed")
async def websocket_feed(ws: WebSocket) -> None:
    """
    Stream live MJPEG frames as base64-encoded JPEG strings.
    Each message is a plain text base64 string (no JSON wrapping) for
    efficient rendering with ``<img src="data:image/jpeg;base64,...">``.
    """
    await manager.connect_feed(ws)
    queue = video_processor.frame_queue

    try:
        while True:
            if queue is None:
                await asyncio.sleep(0.5)
                queue = video_processor.frame_queue
                continue

            try:
                frame_b64: str = await asyncio.wait_for(queue.get(), timeout=2.0)
                await ws.send_text(frame_b64)
            except asyncio.TimeoutError:
                # Send a ping to keep connection alive
                try:
                    await ws.send_text("")
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("Feed WS error", exc_info=True)
    finally:
        manager.disconnect_feed(ws)


@router.websocket("/ws/analytics")
async def websocket_analytics(ws: WebSocket) -> None:
    """
    Stream live analytics snapshots as JSON objects.
    """
    await manager.connect_analytics(ws)
    queue = video_processor.analytics_queue

    try:
        while True:
            if queue is None:
                await asyncio.sleep(0.5)
                queue = video_processor.analytics_queue
                continue

            try:
                snapshot: AnalyticsSnapshot = await asyncio.wait_for(
                    queue.get(), timeout=2.0
                )
                payload = snapshot.model_dump(mode="json")
                # Ensure datetime is serialised as ISO string
                if isinstance(payload.get("timestamp"), datetime):
                    payload["timestamp"] = payload["timestamp"].isoformat()
                await ws.send_json(payload)
            except asyncio.TimeoutError:
                # Heartbeat – send latest snapshot
                try:
                    latest = video_processor.latest_snapshot
                    payload = latest.model_dump(mode="json")
                    if isinstance(payload.get("timestamp"), datetime):
                        payload["timestamp"] = payload["timestamp"].isoformat()
                    await ws.send_json(payload)
                except Exception:
                    break

    except WebSocketDisconnect:
        pass
    except Exception:
        logger.debug("Analytics WS error", exc_info=True)
    finally:
        manager.disconnect_analytics(ws)
