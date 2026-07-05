# ── Build stage ──────────────────────────────────────────────────────────────
FROM python:3.11-slim AS base

# System dependencies for OpenCV headless
RUN apt-get update && apt-get install -y --no-install-recommends \
        libgl1-mesa-glx \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev \
        libgomp1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# Application code
COPY . .

# Create uploads directory
RUN mkdir -p /app/uploads

# Pre-download the YOLOv8 nano model so container starts faster
RUN python -c "from ultralytics import YOLO; YOLO('yolov8n.pt')"

# ── Runtime ──────────────────────────────────────────────────────────────────
EXPOSE 8000

ENV HOST=0.0.0.0
ENV PORT=8000
ENV LOG_LEVEL=INFO
ENV DEMO_MODE=true

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/health')" || exit 1

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
