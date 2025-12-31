# Quick Start Guide

## Prerequisites

1. **ffmpeg** - Video processing engine
   ```bash
   # macOS
   brew install ffmpeg
   
   # Ubuntu/Debian
   sudo apt-get install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Python 3.9+**
   ```bash
   python3 --version
   ```

3. **Node.js 18+**
   ```bash
   node --version
   ```

## Local Setup (5 minutes)

### Option 1: Automated Setup

```bash
# Run setup script
./setup.sh

# Start backend (in one terminal)
cd backend
source venv/bin/activate
uvicorn main:app --reload

# Start frontend (in another terminal)
cd frontend
npm run dev
```

### Option 2: Manual Setup

**Backend:**
```bash
cd backend
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
```

### Option 3: Docker

```bash
docker-compose up
```

## Access the App

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Test the Application

1. Open http://localhost:3000
2. Click "Choose File" and select a video
3. Click "Upload Video"
4. Select number of segments (1-12)
5. Click "Split Video"
6. Wait for processing
7. Download segments individually or as ZIP

## Troubleshooting

### ffmpeg not found
```bash
# Verify installation
ffmpeg -version

# If not installed, install it (see Prerequisites)
```

### Port already in use
```bash
# Backend: Change port in uvicorn command
uvicorn main:app --reload --port 8001

# Frontend: Change in vite.config.js
```

### CORS errors
- Make sure backend is running on port 8000
- Check `VITE_API_URL` in frontend `.env` file

### Video processing fails
- Check video format (mp4, avi, mov, mkv, webm supported)
- Ensure file size is under 50GB (supports videos up to 24 hours)
- Check backend logs for errors
- For very long videos, processing may take time - be patient

## Next Steps

1. **Deploy to Production**
   - See `DEPLOYMENT.md` for detailed instructions
   - Deploy backend to Render
   - Deploy frontend to Vercel

2. **Customize**
   - Edit watermark in `backend/main.py` → `create_watermark_if_not_exists()`
   - Change file size limits in `backend/main.py`
   - Modify UI in `frontend/src/App.jsx`

3. **Extend Features**
   - Add user authentication
   - Implement cloud storage
   - Add batch processing

## Support

For issues or questions:
- Check `PROJECT_PLAN.md` for architecture details
- Review `DEPLOYMENT.md` for deployment help
- Check GitHub issues (when repo is created)

