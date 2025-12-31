# V-Chopz

A free web application for splitting videos into equal-length segments with automatic watermarking.

## Features

- Upload videos up to 24 hours long (50GB max file size)
- Split videos into up to 12 equal segments
- Automatic V-Chopz watermark in bottom right corner
- Real-time progress tracking for uploads and processing
- Async job processing for long videos
- Free to use
- Fast processing with ffmpeg

## Tech Stack

- **Backend**: Python FastAPI
- **Frontend**: React + Vite
- **Video Processing**: ffmpeg
- **Deployment**: Render (backend), Siteground/Vercel (frontend)

## Project Structure

```
.
├── backend/          # FastAPI backend
├── frontend/         # React frontend
├── docker-compose.yml
└── README.md
```

## Setup

### Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

## Deployment

### Backend (Render)
- Connect GitHub repository
- Set build command: `cd backend && pip install -r requirements.txt`
- Set start command: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`

### Frontend (Siteground/Vercel)
- Connect GitHub repository
- Set build command: `cd frontend && npm install && npm run build`
- Set output directory: `frontend/dist`

## Requirements

- Python 3.9+
- Node.js 18+
- ffmpeg installed on system
- Sufficient disk space for video processing (recommend 100GB+ for 24-hour videos)

