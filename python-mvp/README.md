# Smart City Public Safety Python MVP

## MVP
- One local vision process reads a webcam index or video file
- Ultralytics YOLO pose estimates person boxes and keypoints
- The pipeline blurs the head region for privacy
- A heuristic fall detector starts a ground timer
- A fall incident is created after 10 seconds on the ground
- The vision service posts the incident to FastAPI
- The backend persists incidents and sends Telegram alerts
- A Telegram bot handles volunteer inline-button actions
- The project exposes extension hooks for future fire, smoke, panic, fight, abnormal behavior, and natural emergency detectors

## Advanced Later
- Multi-camera orchestration
- RTSP stream ingestion
- Fire, smoke, fight, panic, abnormal-behavior, and natural-emergency models
- Database-backed persistence and analytics
- Queue-based delivery retries
- Operator dashboards and audit workflows
- Active learning and human review tools

## Project Layout
- `backend/`
- `bot/`
- `vision/`
- `shared/`
- `.env`
- `requirements.txt`

## Environment Variables
- `TELEGRAM_BOT_TOKEN`
- `VOLUNTEER_CHAT_ID`
- `BACKEND_URL`

## Setup
1. Install Python 3.10+.
   Recommended: Python 3.12 for the smoothest dependency install.
2. Create and activate a virtual environment.
3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Fill `.env` with your Telegram bot token, volunteer chat id, and backend URL.

## Run Backend
```bash
cd python-mvp
python -m uvicorn backend.app:app --reload
```

## Run Telegram Bot
```bash
cd python-mvp
python -m bot.app
```

## Run Vision With Webcam
```bash
cd python-mvp
python -m vision.app --source 0 --source-id camera-01 --location-label "Main Square"
```

## Run Vision With Video File
```bash
cd python-mvp
python -m vision.app --source demo-fall.mp4 --source-id camera-02 --location-label "Crosswalk A"
```

## Volunteer Flow
- Backend sends a structured Telegram alert to the configured volunteer chat
- Volunteers tap `Accept`, `On my way`, or `Resolved`
- The bot receives the callback and posts the response to the backend
- The backend records the response in local JSON persistence

## Notes
- The MVP uses pose-based privacy blur and does not perform face recognition
- The fall detector is heuristic and hackathon-friendly, not a medical-grade classifier
- Future detectors can be added by registering plugins in `vision/detectors.py`
