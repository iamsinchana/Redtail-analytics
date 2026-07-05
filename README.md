# 🔴 Redtail Analytics

**Production-grade real-time intelligent video analytics platform**

Redtail Analytics is an AI-powered video surveillance and analytics platform that provides real-time people counting, crowd detection, and unauthorized entry detection using state-of-the-art computer vision models.

---

## ✨ Features

| Feature | Description |
|---|---|
| 👥 **People Counting** | Track and count individuals crossing configurable lines with unique ID tracking |
| 🏟️ **Crowd Detection** | Real-time alerts when person density exceeds configurable thresholds in monitored zones |
| 🚫 **Zone Intrusion** | Detect unauthorized entry into configurable restricted polygon zones |
| 📊 **Live Dashboard** | Premium React dashboard with real-time video feed, analytics widgets, and event log |
| ⚡ **Real-time Processing** | Sub-second inference using YOLOv8 + ByteTrack pipeline |
| 🐳 **Docker Deployment** | One-command deployment with Docker Compose |
| 📈 **MLflow Tracking** | Inference metrics logging and model versioning |

---

## 🏗️ Architecture

```
┌─────────────┐     WebSocket/REST     ┌──────────────┐
│   React     │ ◄──────────────────── │   FastAPI     │
│   Dashboard │                        │   Backend     │
└─────────────┘                        └──────┬───────┘
                                              │
                               ┌──────────────┼──────────────┐
                               │              │              │
                         ┌─────▼─────┐  ┌─────▼─────┐  ┌────▼────┐
                         │  YOLOv8   │  │ ByteTrack │  │ MLflow  │
                         │ Detection │  │ Tracking  │  │ Metrics │
                         └───────────┘  └───────────┘  └─────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Detection** | YOLOv8 Nano (pretrained, CPU-optimized) |
| **Tracking** | ByteTrack (via Supervision library) |
| **Backend** | FastAPI + Uvicorn |
| **Frontend** | React + Vite |
| **Deployment** | Docker + Docker Compose |
| **ML Ops** | MLflow |
| **Video I/O** | OpenCV |

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- (Optional) Python 3.11+ for local development

### Docker Deployment (Recommended)

```bash
# Clone the repository
git clone <repo-url>
cd Redtail-analytics

# Copy environment config
cp .env.example .env

# Start all services
docker-compose up --build -d

# Access the platform
# Dashboard:  http://localhost:3000
# API:        http://localhost:8000/docs
# MLflow:     http://localhost:5000
```

### Local Development

**Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## 📁 Project Structure

```
Redtail-analytics/
├── backend/
│   ├── app/
│   │   ├── api/          # REST & WebSocket endpoints
│   │   ├── core/         # Detection, tracking, analytics engine
│   │   ├── models/       # Pydantic schemas
│   │   └── utils/        # Drawing & annotation utilities
│   ├── tests/            # Unit tests
│   ├── Dockerfile
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/   # React UI components
│   │   ├── hooks/        # Custom React hooks
│   │   ├── services/     # API service layer
│   │   └── utils/        # Formatters & helpers
│   ├── Dockerfile
│   └── vercel.json
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## ⚙️ Configuration

All settings are configurable via environment variables (see `.env.example`):

| Variable | Default | Description |
|---|---|---|
| `MODEL_NAME` | `yolov8n.pt` | YOLOv8 model variant |
| `CONFIDENCE_THRESHOLD` | `0.35` | Detection confidence threshold |
| `VIDEO_SOURCE` | _(empty/demo)_ | Video source (webcam, file path, RTSP URL) |
| `CROWD_THRESHOLD` | `5` | People count to trigger crowd alert |
| `CORS_ORIGINS` | `localhost:5173` | Allowed CORS origins |

---

## 🌐 Deployment

### Vercel (Frontend Only)
```bash
cd frontend
npx vercel --prod
```

### Full Stack (Docker)
```bash
docker-compose up --build -d
```

---

## 📊 API Documentation

Once the backend is running, access the interactive API docs at:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 📄 License

MIT License - See [LICENSE](LICENSE) for details.

---

<p align="center">
  Built with ❤️ by the Redtail Analytics Team
</p>
