"""
Application configuration using pydantic-settings.
All settings can be overridden via environment variables or a .env file.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from pydantic_settings import BaseSettings, SettingsConfigDict

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Central configuration for Redtail-Analytics backend."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────────────────
    APP_NAME: str = "Redtail-Analytics"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"

    # ── Server ───────────────────────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── CORS ─────────────────────────────────────────────────────────────
    CORS_ORIGINS: list[str] = ["*"]

    # ── YOLOv8 Model ─────────────────────────────────────────────────────
    MODEL_PATH: str = "yolov8n.pt"
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    DEVICE: str = "cpu"

    # ── Video ────────────────────────────────────────────────────────────
    VIDEO_SOURCE: Optional[str] = None  # None = demo mode
    FRAME_WIDTH: int = 640
    FRAME_HEIGHT: int = 480
    MAX_FPS: int = 30

    # ── Analytics ────────────────────────────────────────────────────────
    CROWD_THRESHOLD: int = 5
    LINE_POSITION_Y_RATIO: float = 0.5  # counting line at 50 % height
    MAX_EVENTS: int = 500

    # ── MLflow ───────────────────────────────────────────────────────────
    MLFLOW_ENABLED: bool = False
    MLFLOW_TRACKING_URI: str = "mlruns"
    MLFLOW_EXPERIMENT_NAME: str = "redtail-analytics"
    MLFLOW_LOG_INTERVAL_SECONDS: float = 30.0

    # ── Demo Mode ────────────────────────────────────────────────────────
    DEMO_MODE: bool = True  # auto-set to True when VIDEO_SOURCE is None

    # ── Upload ───────────────────────────────────────────────────────────
    UPLOAD_DIR: str = "uploads"

    def configure_logging(self) -> None:
        """Apply logging configuration globally."""
        numeric_level = getattr(logging, self.LOG_LEVEL.upper(), logging.INFO)
        logging.basicConfig(
            level=numeric_level,
            format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        # Suppress noisy third-party loggers
        for noisy in ("ultralytics", "mlflow", "urllib3", "httpx"):
            logging.getLogger(noisy).setLevel(logging.WARNING)
        logger.info("Logging configured at %s level", self.LOG_LEVEL.upper())

    def ensure_upload_dir(self) -> Path:
        """Create the upload directory if it does not exist."""
        path = Path(self.UPLOAD_DIR)
        path.mkdir(parents=True, exist_ok=True)
        return path


# Singleton settings instance
settings = Settings()
