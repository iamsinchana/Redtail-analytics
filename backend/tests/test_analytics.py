"""
Tests for the Redtail-Analytics backend.

Uses httpx + pytest to test REST endpoints and core analytics logic.
The tests exercise the API layer and the analytics engine independently
so they can run without a GPU or a real video source.
"""

from __future__ import annotations

import asyncio
import uuid
from datetime import datetime
from unittest.mock import patch

import numpy as np
import pytest
from fastapi.testclient import TestClient

from app.config import settings
from app.core.analytics import AnalyticsEngine
from app.models.schemas import (
    AnalyticsEvent,
    AnalyticsSnapshot,
    EventType,
    ZoneConfig,
    ZonePoint,
)


# ── Fixtures ─────────────────────────────────────────────────────────────────


@pytest.fixture(scope="module")
def client():
    """
    Create a TestClient for the FastAPI app.
    We patch the detector load so tests don't need the YOLO weights.
    """
    with patch("app.core.detector.PersonDetector.load"):
        from app.main import app
        with TestClient(app) as c:
            yield c


@pytest.fixture()
def analytics_engine():
    """Fresh AnalyticsEngine for unit tests."""
    return AnalyticsEngine(
        frame_width=640,
        frame_height=480,
        crowd_threshold=3,
        line_y_ratio=0.5,
        max_events=100,
    )


# ── REST Endpoint Tests ─────────────────────────────────────────────────────


class TestHealthEndpoint:
    def test_health_returns_ok(self, client: TestClient):
        resp = client.get("/api/health")
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ok"
        assert "version" in data
        assert "uptime_seconds" in data

    def test_health_contains_model_status(self, client: TestClient):
        resp = client.get("/api/health")
        data = resp.json()
        assert "model_loaded" in data
        assert "video_active" in data


class TestAnalyticsEndpoint:
    def test_analytics_returns_snapshot(self, client: TestClient):
        resp = client.get("/api/analytics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_persons" in data
        assert "fps" in data
        assert "frame_number" in data


class TestEventsEndpoint:
    def test_events_returns_list(self, client: TestClient):
        resp = client.get("/api/events")
        assert resp.status_code == 200
        data = resp.json()
        assert "events" in data
        assert "total" in data
        assert isinstance(data["events"], list)

    def test_events_with_limit(self, client: TestClient):
        resp = client.get("/api/events?limit=10")
        assert resp.status_code == 200


class TestZonesEndpoint:
    def test_get_zones_empty(self, client: TestClient):
        resp = client.get("/api/zones")
        assert resp.status_code == 200
        data = resp.json()
        assert "zones" in data

    def test_set_zones(self, client: TestClient):
        zones = [
            {
                "name": "TestZone",
                "polygon": [
                    {"x": 100, "y": 100},
                    {"x": 300, "y": 100},
                    {"x": 300, "y": 300},
                    {"x": 100, "y": 300},
                ],
                "enabled": True,
            }
        ]
        resp = client.post("/api/zones", json=zones)
        assert resp.status_code == 200
        data = resp.json()
        assert data["success"] is True

    def test_set_and_get_zones(self, client: TestClient):
        zones = [
            {
                "name": "RestrictedArea",
                "polygon": [
                    {"x": 50, "y": 50},
                    {"x": 200, "y": 50},
                    {"x": 200, "y": 200},
                ],
                "enabled": True,
            }
        ]
        client.post("/api/zones", json=zones)
        resp = client.get("/api/zones")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data["zones"]) >= 1
        assert data["zones"][0]["name"] == "RestrictedArea"


class TestVideoSourceEndpoint:
    def test_list_sources(self, client: TestClient):
        resp = client.get("/api/video/sources")
        assert resp.status_code == 200
        data = resp.json()
        assert "sources" in data
        assert isinstance(data["sources"], list)

    def test_set_demo_source(self, client: TestClient):
        resp = client.post(
            "/api/video/source",
            json={"source": "demo", "source_type": "demo"},
        )
        assert resp.status_code == 200

    def test_set_invalid_file_source(self, client: TestClient):
        resp = client.post(
            "/api/video/source",
            json={"source": "/nonexistent/video.mp4", "source_type": "file"},
        )
        assert resp.status_code == 404

    def test_set_invalid_rtsp_source(self, client: TestClient):
        resp = client.post(
            "/api/video/source",
            json={"source": "http://invalid", "source_type": "rtsp"},
        )
        assert resp.status_code == 400


# ── Analytics Engine Unit Tests ──────────────────────────────────────────────


class TestAnalyticsEngine:
    def test_initial_state(self, analytics_engine: AnalyticsEngine):
        events = analytics_engine.get_events()
        assert len(events) == 0

    def test_process_empty_detections(self, analytics_engine: AnalyticsEngine):
        import supervision as sv

        detections = sv.Detections.empty()
        snapshot = analytics_engine.process(detections, frame_number=1)
        assert snapshot.total_persons == 0
        assert snapshot.crowd_detected is False

    def test_crowd_detection_triggers(self, analytics_engine: AnalyticsEngine):
        """When person_count >= threshold, crowd_detected should be True."""
        import supervision as sv

        # Simulate 4 detections (threshold is 3)
        xyxy = np.array(
            [
                [10, 10, 50, 80],
                [60, 10, 100, 80],
                [110, 10, 150, 80],
                [160, 10, 200, 80],
            ],
            dtype=np.float32,
        )
        confidence = np.array([0.9, 0.85, 0.8, 0.75])
        class_id = np.array([0, 0, 0, 0])
        tracker_id = np.array([1, 2, 3, 4])

        detections = sv.Detections(
            xyxy=xyxy,
            confidence=confidence,
            class_id=class_id,
            tracker_id=tracker_id,
        )
        snapshot = analytics_engine.process(detections, frame_number=1)
        assert snapshot.total_persons == 4
        assert snapshot.crowd_detected is True
        assert snapshot.active_tracks == 4

    def test_crowd_clear_event(self, analytics_engine: AnalyticsEngine):
        """When crowd clears, a CROWD_CLEARED event should be emitted."""
        import supervision as sv

        # First trigger crowd
        xyxy = np.array(
            [[10, 10, 50, 80], [60, 10, 100, 80], [110, 10, 150, 80]],
            dtype=np.float32,
        )
        detections = sv.Detections(
            xyxy=xyxy,
            confidence=np.array([0.9, 0.85, 0.8]),
            class_id=np.array([0, 0, 0]),
            tracker_id=np.array([1, 2, 3]),
        )
        analytics_engine.process(detections, frame_number=1)

        # Then clear
        empty = sv.Detections.empty()
        analytics_engine.process(empty, frame_number=2)

        events = analytics_engine.get_events()
        event_types = [e.event_type for e in events]
        assert EventType.CROWD_CLEARED in event_types

    def test_zone_configuration(self, analytics_engine: AnalyticsEngine):
        zones = [
            ZoneConfig(
                name="TestZone",
                polygon=[
                    ZonePoint(x=100, y=100),
                    ZonePoint(x=300, y=100),
                    ZonePoint(x=300, y=300),
                    ZonePoint(x=100, y=300),
                ],
                enabled=True,
            )
        ]
        analytics_engine.set_zones(zones)
        retrieved = analytics_engine.get_zones()
        assert len(retrieved) == 1
        assert retrieved[0].name == "TestZone"

    def test_reset_clears_state(self, analytics_engine: AnalyticsEngine):
        import supervision as sv

        xyxy = np.array(
            [[10, 10, 50, 80], [60, 10, 100, 80], [110, 10, 150, 80]],
            dtype=np.float32,
        )
        detections = sv.Detections(
            xyxy=xyxy,
            confidence=np.array([0.9, 0.85, 0.8]),
            class_id=np.array([0, 0, 0]),
            tracker_id=np.array([1, 2, 3]),
        )
        analytics_engine.process(detections, frame_number=1)

        analytics_engine.reset()
        events = analytics_engine.get_events()
        assert len(events) == 0


# ── Schema Tests ─────────────────────────────────────────────────────────────


class TestSchemas:
    def test_analytics_snapshot_defaults(self):
        snap = AnalyticsSnapshot()
        assert snap.total_persons == 0
        assert snap.fps == 0.0
        assert snap.crowd_detected is False

    def test_analytics_event_creation(self):
        event = AnalyticsEvent(
            id="test123",
            event_type=EventType.CROWD_DETECTED,
            description="Test crowd event",
            details={"count": 10},
        )
        assert event.event_type == EventType.CROWD_DETECTED
        assert event.details["count"] == 10

    def test_zone_config_validation(self):
        zone = ZoneConfig(
            name="test",
            polygon=[
                ZonePoint(x=0, y=0),
                ZonePoint(x=100, y=0),
                ZonePoint(x=100, y=100),
            ],
        )
        assert len(zone.polygon) == 3

    def test_zone_config_requires_min_points(self):
        with pytest.raises(Exception):
            ZoneConfig(
                name="bad",
                polygon=[ZonePoint(x=0, y=0), ZonePoint(x=1, y=1)],
            )
