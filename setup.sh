#!/bin/bash

echo "🚀 Setting up V-Chopz..."

# Check if ffmpeg is installed
if ! command -v ffmpeg &> /dev/null; then
    echo "❌ ffmpeg is not installed. Please install it first:"
    echo "   macOS: brew install ffmpeg"
    echo "   Ubuntu: sudo apt-get install ffmpeg"
    echo "   Windows: Download from https://ffmpeg.org/download.html"
    exit 1
fi

echo "✅ ffmpeg found"

# Setup backend
echo "📦 Setting up backend..."
cd backend
if [ ! -d "venv" ]; then
    python3 -m venv venv
fi
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend
if [ ! -d "node_modules" ]; then
    npm install
fi
cd ..

echo "✅ Setup complete!"
echo ""
echo "To run the application:"
echo "  1. Backend: cd backend && source venv/bin/activate && uvicorn main:app --reload"
echo "  2. Frontend: cd frontend && npm run dev"
echo ""
echo "Or use Docker: docker-compose up"

