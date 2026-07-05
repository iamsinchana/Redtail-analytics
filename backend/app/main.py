"""
FastAPI application entry point for Redtail-Analytics.

Includes CORS middleware, lifespan events for startup/shutdown of the
video processing pipeline, and mounts all routers.
"""

from __future__ import annotations

import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes import router as api_router
from app.api.websocket import router as ws_router
from app.config import settings
from app.core.video_processor import video_processor

logger = logging.getLogger(__name__)


# ── Lifespan ─────────────────────────────────────────────────────────────────


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Startup: configure logging, initialise video processor, start background
    processing.
    Shutdown: stop video processor gracefully.
    """
    # ── Startup ──────────────────────────────────────────────────────────
    settings.configure_logging()
    logger.info("Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)

    # Create upload directory
    settings.ensure_upload_dir()

    # Initialise the video processor with the current event loop
    loop = asyncio.get_running_loop()
    video_processor.initialise(loop)

    # Auto-start in demo mode if no explicit source is set
    if settings.VIDEO_SOURCE is None or settings.DEMO_MODE:
        logger.info("No VIDEO_SOURCE configured – starting in demo mode")
    video_processor.start()

    logger.info("Startup complete – server ready on %s:%d", settings.HOST, settings.PORT)

    yield  # ← application runs here

    # ── Shutdown ─────────────────────────────────────────────────────────
    logger.info("Shutting down …")
    video_processor.stop()
    logger.info("Shutdown complete")


# ── Application ──────────────────────────────────────────────────────────────


def create_app() -> FastAPI:
    """Application factory."""
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description="Real-time video analytics platform – person detection, tracking, counting, and zone intrusion.",
        lifespan=lifespan,
    )

    # ── CORS ─────────────────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Routers ──────────────────────────────────────────────────────────
    app.include_router(api_router)
    app.include_router(ws_router)

    return app


app = create_app()


# ── Run directly with `python -m app.main` ──────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.DEBUG,
        log_level=settings.LOG_LEVEL.lower(),
    )
