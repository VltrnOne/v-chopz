from fastapi import FastAPI, File, UploadFile, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from typing import Optional, Dict
import os
import shutil
import uuid
import asyncio
from pathlib import Path
import ffmpeg
from datetime import datetime
from enum import Enum

app = FastAPI(title="V-Chopz API")

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify your frontend domain (vchopz.com)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
UPLOAD_DIR = Path("uploads")
OUTPUT_DIR = Path("outputs")
TEMP_DIR = Path("temp")
WATERMARK_PATH = Path("watermark.png")

# Create directories if they don't exist
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)
TEMP_DIR.mkdir(exist_ok=True)

# Job status tracking (in-memory, consider Redis for production)
class JobStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

job_statuses: Dict[str, dict] = {}

# Configuration
MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024  # 50GB for 24-hour videos
MAX_VIDEO_DURATION = 24 * 60 * 60  # 24 hours in seconds


def get_video_duration(video_path: str) -> float:
    """Get video duration in seconds"""
    try:
        probe = ffmpeg.probe(video_path)
        # Try to get duration from format first, then streams
        duration = None
        if 'format' in probe and 'duration' in probe['format']:
            duration = float(probe['format']['duration'])
        elif 'streams' in probe and len(probe['streams']) > 0:
            for stream in probe['streams']:
                if 'duration' in stream:
                    duration = float(stream['duration'])
                    break
        
        if duration is None:
            raise ValueError("Could not determine video duration")
        
        return duration
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading video: {str(e)}")


def create_watermark_if_not_exists():
    """Create a V-Chopz by VLTRN watermark if it doesn't exist"""
    if not WATERMARK_PATH.exists():
        from PIL import Image, ImageDraw, ImageFont
        
        # Create watermark image with semi-transparent background
        # Wider to accommodate "V-Chopz by VLTRN"
        img = Image.new('RGBA', (280, 60), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        
        # Try to use a nice font, fallback to default
        font_size = 24  # Slightly smaller to fit longer text
        try:
            # Try different font paths
            font_paths = [
                "/System/Library/Fonts/Helvetica.ttc",
                "/System/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
                "/Windows/Fonts/arial.ttf",
            ]
            font = None
            for path in font_paths:
                try:
                    font = ImageFont.truetype(path, font_size)
                    break
                except:
                    continue
            if font is None:
                font = ImageFont.load_default()
        except:
            font = ImageFont.load_default()
        
        # Draw "V-Chopz by VLTRN" text with shadow effect
        text = "V-Chopz by VLTRN"
        # Shadow
        draw.text((12, 17), text, fill=(0, 0, 0, 150), font=font)
        # Main text
        draw.text((10, 15), text, fill=(255, 255, 255, 220), font=font)
        
        img.save(WATERMARK_PATH)
        print(f"Created watermark at {WATERMARK_PATH}")


def split_video_with_watermark(
    input_path: str,
    output_dir: str,
    num_splits: int,
    job_id: str
) -> list:
    """Split video into equal segments with watermark"""
    try:
        # Update status
        job_statuses[job_id] = {
            "status": JobStatus.PROCESSING,
            "progress": 0,
            "total_segments": num_splits,
            "message": "Starting video processing..."
        }
        
        duration = get_video_duration(input_path)
        segment_duration = duration / num_splits
        
        output_files = []
        
        # Ensure watermark exists
        create_watermark_if_not_exists()
        
        for i in range(num_splits):
            start_time = i * segment_duration
            output_file = os.path.join(output_dir, f"segment_{i+1:02d}.mp4")
            
            # Update progress
            job_statuses[job_id]["progress"] = i + 1
            job_statuses[job_id]["message"] = f"Processing segment {i+1} of {num_splits}..."
            
            # Build ffmpeg command
            input_stream = ffmpeg.input(input_path, ss=start_time, t=segment_duration)
            
            # Add watermark if it exists
            if WATERMARK_PATH.exists():
                watermark = ffmpeg.input(str(WATERMARK_PATH))
                # Overlay watermark in bottom right
                video = ffmpeg.overlay(
                    input_stream,
                    watermark,
                    x='main_w-overlay_w-10',
                    y='main_h-overlay_h-10'
                )
            else:
                video = input_stream
            
            # Output - use faster encoding for long videos
            output = ffmpeg.output(
                video,
                output_file,
                vcodec='libx264',
                acodec='aac',
                preset='fast',  # Faster encoding for long videos
                **{'movflags': 'faststart'}
            )
            
            # Run ffmpeg
            ffmpeg.run(output, overwrite_output=True, quiet=True)
            output_files.append(output_file)
        
        # Mark as completed
        job_statuses[job_id] = {
            "status": JobStatus.COMPLETED,
            "progress": num_splits,
            "total_segments": num_splits,
            "message": "Video split successfully",
            "output_files": [os.path.basename(f) for f in output_files]
        }
        
        return output_files
    except Exception as e:
        # Mark as failed
        job_statuses[job_id] = {
            "status": JobStatus.FAILED,
            "message": f"Error: {str(e)}"
        }
        raise


@app.get("/")
async def root():
    return {"message": "V-Chopz API", "status": "running"}


@app.post("/upload")
async def upload_video(file: UploadFile = File(...)):
    """Upload video file - supports videos up to 24 hours"""
    if not file.content_type or not file.content_type.startswith('video/'):
        raise HTTPException(status_code=400, detail="File must be a video")
    
    # Check file size (read in chunks for large files)
    file_size = 0
    chunk_size = 1024 * 1024  # 1MB chunks
    
    # Generate unique job ID
    job_id = str(uuid.uuid4())
    job_dir = UPLOAD_DIR / job_id
    job_dir.mkdir(exist_ok=True)
    
    # Initialize job status
    job_statuses[job_id] = {
        "status": JobStatus.PENDING,
        "message": "Uploading video..."
    }
    
    # Save uploaded file and check size
    file_path = job_dir / file.filename
    with open(file_path, "wb") as buffer:
        while True:
            chunk = await file.read(chunk_size)
            if not chunk:
                break
            file_size += len(chunk)
            if file_size > MAX_FILE_SIZE:
                # Clean up
                if file_path.exists():
                    file_path.unlink()
                raise HTTPException(
                    status_code=400, 
                    detail=f"File size exceeds maximum of {MAX_FILE_SIZE / (1024**3):.1f}GB"
                )
            buffer.write(chunk)
    
    # Get video duration and validate
    try:
        duration = get_video_duration(str(file_path))
        if duration > MAX_VIDEO_DURATION:
            raise HTTPException(
                status_code=400,
                detail=f"Video duration exceeds maximum of 24 hours"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid video file: {str(e)}")
    
    # Update job status
    job_statuses[job_id] = {
        "status": JobStatus.PENDING,
        "message": "Video uploaded successfully",
        "duration": duration
    }
    
    return {
        "job_id": job_id,
        "filename": file.filename,
        "duration": duration,
        "file_size": file_size,
        "message": "Video uploaded successfully"
    }


@app.post("/split/{job_id}")
async def split_video(
    job_id: str, 
    num_splits: int = Query(..., ge=1, le=12)
):
    """Split video into segments - runs asynchronously for long videos"""
    if num_splits < 1 or num_splits > 12:
        raise HTTPException(status_code=400, detail="Number of splits must be between 1 and 12")
    
    # Find uploaded video
    job_dir = UPLOAD_DIR / job_id
    if not job_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    video_files = list(job_dir.glob("*"))
    if not video_files:
        raise HTTPException(status_code=404, detail="Video file not found")
    
    input_video = video_files[0]
    
    # Create output directory
    output_dir = OUTPUT_DIR / job_id
    output_dir.mkdir(exist_ok=True)
    
    # Check if already processing
    if job_id in job_statuses and job_statuses[job_id].get("status") == JobStatus.PROCESSING:
        raise HTTPException(status_code=400, detail="Video is already being processed")
    
    # Initialize processing status
    job_statuses[job_id] = {
        "status": JobStatus.PROCESSING,
        "progress": 0,
        "total_segments": num_splits,
        "message": "Starting video processing..."
    }
    
    # Start background task for splitting using thread pool
    async def process_video_async():
        loop = asyncio.get_event_loop()
        try:
            await loop.run_in_executor(
                None,
                split_video_with_watermark,
                str(input_video),
                str(output_dir),
                num_splits,
                job_id
            )
        except Exception as e:
            job_statuses[job_id] = {
                "status": JobStatus.FAILED,
                "message": f"Error: {str(e)}"
            }
    
    # Use asyncio.create_task to run in background
    asyncio.create_task(process_video_async())
    
    return {
        "job_id": job_id,
        "num_splits": num_splits,
        "status": "processing",
        "message": "Video splitting started. Use /status/{job_id} to check progress."
    }


@app.get("/status/{job_id}")
async def get_job_status(job_id: str):
    """Get the status of a video splitting job"""
    if job_id not in job_statuses:
        raise HTTPException(status_code=404, detail="Job not found")
    
    status = job_statuses[job_id]
    
    # Calculate progress percentage if processing
    progress_percent = 0
    if status["status"] == JobStatus.PROCESSING and "total_segments" in status:
        progress_percent = int((status["progress"] / status["total_segments"]) * 100)
    
    return {
        "job_id": job_id,
        "status": status["status"],
        "message": status.get("message", ""),
        "progress": status.get("progress", 0),
        "total_segments": status.get("total_segments", 0),
        "progress_percent": progress_percent,
        "output_files": status.get("output_files", [])
    }


@app.get("/download/{job_id}")
async def download_segment(job_id: str, segment: int):
    """Download a specific segment"""
    output_dir = OUTPUT_DIR / job_id
    segment_file = output_dir / f"segment_{segment:02d}.mp4"
    
    if not segment_file.exists():
        raise HTTPException(status_code=404, detail="Segment not found")
    
    return FileResponse(
        segment_file,
        media_type="video/mp4",
        filename=segment_file.name
    )


@app.get("/download-all/{job_id}")
async def download_all(job_id: str):
    """Download all segments as a zip file"""
    import zipfile
    
    output_dir = OUTPUT_DIR / job_id
    if not output_dir.exists():
        raise HTTPException(status_code=404, detail="Job not found")
    
    zip_path = TEMP_DIR / f"{job_id}.zip"
    
    with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for file in output_dir.glob("*.mp4"):
            zipf.write(file, file.name)
    
    return FileResponse(
        zip_path,
        media_type="application/zip",
        filename=f"vchopz_segments_{job_id}.zip"
    )


@app.delete("/cleanup/{job_id}")
async def cleanup(job_id: str):
    """Clean up uploaded files and outputs"""
    job_upload_dir = UPLOAD_DIR / job_id
    job_output_dir = OUTPUT_DIR / job_id
    zip_file = TEMP_DIR / f"{job_id}.zip"
    
    if job_upload_dir.exists():
        shutil.rmtree(job_upload_dir)
    if job_output_dir.exists():
        shutil.rmtree(job_output_dir)
    if zip_file.exists():
        zip_file.unlink()
    
    return {"message": "Cleanup successful"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

