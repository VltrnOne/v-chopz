# V-Chopz - Complete Project Plan

## Project Overview

A free web application that allows users to upload videos, split them into up to 12 equal segments, and automatically add a V-Chopz watermark to each segment.

## Architecture

### Tech Stack
- **Backend**: Python FastAPI
- **Frontend**: React + Vite
- **Video Processing**: ffmpeg
- **Deployment**: 
  - Backend: Render
  - Frontend: Vercel/Siteground
  - Storage: Local (can be upgraded to Oracle Object Storage)

### Project Structure
```
Video Spliter/
├── backend/              # FastAPI backend
│   ├── main.py          # API endpoints
│   ├── requirements.txt # Python dependencies
│   └── Dockerfile       # Container config
├── frontend/            # React frontend
│   ├── src/
│   │   ├── App.jsx      # Main component
│   │   └── App.css      # Styles
│   ├── package.json     # Node dependencies
│   └── Dockerfile       # Container config
├── docker-compose.yml   # Local development
├── render.yaml          # Render deployment config
└── README.md            # Documentation
```

## Features

### Core Features ✅
1. **Video Upload**
   - Accepts common video formats (mp4, avi, mov, mkv, webm)
   - Supports videos up to 24 hours long (50GB file size limit)
   - Upload progress tracking
   - Unique job ID generation

2. **Video Splitting**
   - Split into 1-12 equal segments
   - Automatic duration calculation
   - Async processing for long videos
   - Real-time progress tracking with status polling
   - Progress indication with percentage

3. **Watermarking**
   - V-Chopz watermark in bottom right corner
   - Automatic watermark creation if missing
   - Semi-transparent overlay

4. **Download**
   - Individual segment download
   - ZIP download of all segments
   - Clean file naming

### Future Enhancements (Optional)
- User accounts and history
- Cloud storage integration (Oracle Object Storage)
- Lightning Network payments for premium features
- Batch processing
- Custom watermark upload
- Video quality selection
- Progress bars for long videos

## Development Workflow

### Local Development

1. **Prerequisites**
   ```bash
   # Install ffmpeg
   brew install ffmpeg  # macOS
   
   # Install Python 3.9+
   # Install Node.js 18+
   ```

2. **Setup**
   ```bash
   ./setup.sh
   ```

3. **Run Backend**
   ```bash
   cd backend
   source venv/bin/activate
   uvicorn main:app --reload
   ```

4. **Run Frontend**
   ```bash
   cd frontend
   npm run dev
   ```

5. **Access**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000
   - API Docs: http://localhost:8000/docs

### Docker Development

```bash
docker-compose up
```

## Deployment Strategy

### Phase 1: Initial Deployment

1. **GitHub Repository**
   - Create repository
   - Push code
   - Set up branch protection

2. **Backend (Render)**
   - Connect GitHub repo
   - Configure build/start commands
   - Set environment variables
   - Note: Free tier may need Dockerfile for ffmpeg

3. **Frontend (Vercel)**
   - Connect GitHub repo
   - Configure build settings
   - Set API URL environment variable
   - Deploy

### Phase 2: Optimization

1. **Storage**
   - Consider Oracle Object Storage for large files
   - Implement cleanup jobs for old files

2. **Performance**
   - Add async job processing
   - Implement Redis for job queues
   - Add CDN for static assets

3. **Monitoring**
   - Set up error tracking (Sentry)
   - Add analytics
   - Monitor API usage

### Phase 3: Scaling (If Needed)

1. **Infrastructure**
   - Move to Oracle Cloud for better performance
   - Set up load balancing
   - Implement auto-scaling

2. **Features**
   - Add user authentication
   - Implement payment processing (Lightning)
   - Add video preview
   - Batch processing

## API Endpoints

### POST /upload
- Upload video file (up to 50GB, 24 hours)
- Returns: job_id, filename, duration, file_size

### POST /split/{job_id}?num_splits={n}
- Start async video splitting into n segments
- Returns: job_id, num_splits, status, message

### GET /status/{job_id}
- Get job processing status
- Returns: status, progress, progress_percent, message, output_files

### GET /download/{job_id}?segment={n}
- Download specific segment

### GET /download-all/{job_id}
- Download all segments as ZIP

### DELETE /cleanup/{job_id}
- Clean up uploaded files and outputs

## Environment Variables

### Backend
- `PORT`: Server port (default: 8000)
- `ALLOWED_ORIGINS`: CORS origins
- `MAX_FILE_SIZE`: Max upload size in bytes

### Frontend
- `VITE_API_URL`: Backend API URL

## Testing Checklist

- [ ] Video upload works
- [ ] File validation (size, type)
- [ ] Video splitting (1-12 segments)
- [ ] Watermark appears correctly
- [ ] Individual segment download
- [ ] ZIP download
- [ ] Error handling
- [ ] CORS configuration
- [ ] Mobile responsiveness

## Known Limitations

1. **Render Free Tier**
   - Limited processing time (may timeout on 24-hour videos)
   - No persistent storage (files deleted on restart)
   - May need Dockerfile for ffmpeg
   - May need paid plan for large file processing

2. **File Size**
   - 50GB limit (supports videos up to 24 hours)
   - Large files may take 30+ minutes to process
   - Requires significant disk space (100GB+ recommended)

3. **Concurrent Users**
   - Free tier has limited resources
   - Consider queue system for production
   - Long videos require substantial processing power

## Security Considerations

1. **File Upload**
   - Validate file types
   - Limit file sizes
   - Sanitize filenames

2. **CORS**
   - Restrict origins in production
   - Don't use wildcard in production

3. **Rate Limiting**
   - Implement rate limiting for API
   - Prevent abuse

4. **Cleanup**
   - Automatic cleanup of old files
   - Prevent storage overflow

## Cost Estimation

### Free Tier (Initial)
- Render: Free (with limitations)
- Vercel: Free
- GitHub: Free
- **Total: $0/month**

### Paid Tier (If Needed)
- Render: $7-25/month
- Vercel: Free (or Pro $20/month)
- Oracle Cloud: Free tier available
- **Total: $7-45/month**

## Timeline

### Week 1: Development
- ✅ Project setup
- ✅ Backend API
- ✅ Frontend UI
- ✅ Local testing

### Week 2: Deployment
- GitHub setup
- Render deployment
- Vercel deployment
- Testing

### Week 3: Optimization
- Performance tuning
- Error handling
- Documentation
- User testing

## Next Steps

1. **Immediate**
   - Test locally
   - Fix any bugs
   - Create GitHub repo

2. **Short-term**
   - Deploy to Render
   - Deploy to Vercel
   - Test end-to-end

3. **Long-term**
   - Add monitoring
   - Optimize performance
   - Consider paid features

## Tools Integration

### GitHub
- Version control
- CI/CD workflows
- Issue tracking

### Render
- Backend hosting
- Automatic deployments
- Environment management

### Vercel/Siteground
- Frontend hosting
- CDN
- Analytics

### Oracle Cloud (Future)
- Object storage
- Compute instances
- Database (if needed)

### Lightning Network (Future)
- Payment processing
- Microtransactions
- Premium features

## Support & Maintenance

### Monitoring
- API health checks
- Error logging
- Usage analytics

### Updates
- Regular dependency updates
- Security patches
- Feature additions

### Documentation
- API documentation (FastAPI auto-generates)
- User guide
- Deployment guide

