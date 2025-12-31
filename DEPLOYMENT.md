# Deployment Guide

## Overview

This guide covers deploying V-Chopz to various platforms.

## Prerequisites

- GitHub account and repository
- Accounts on: Render, Siteground (or Vercel), Oracle Cloud (optional)
- ffmpeg installed on deployment servers

## Deployment Steps

### 1. GitHub Setup

```bash
# Initialize git repository
git init
git add .
git commit -m "Initial commit: V-Chopz"

# Create GitHub repository and push
git remote add origin https://github.com/yourusername/v-chopz.git
git branch -M main
git push -u origin main
```

### 2. Backend Deployment (Render)

1. **Create Render Account**
   - Go to https://render.com
   - Sign up/login

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the repository

3. **Configure Service**
   - **Name**: `v-chopz-api`
   - **Environment**: `Python 3`
   - **Build Command**: `cd backend && pip install -r requirements.txt`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan**: Free tier (or paid for better performance)

4. **Environment Variables**
   - Add any required environment variables
   - Note the service URL (e.g., `https://v-chopz-api.onrender.com`)

5. **Add ffmpeg**
   - Render's free tier may not include ffmpeg
   - You may need to use a Dockerfile or upgrade to a paid plan
   - Alternative: Use a buildpack that includes ffmpeg

### 3. Frontend Deployment (Siteground/Vercel)

#### Option A: Vercel (Recommended for React)

1. **Create Vercel Account**
   - Go to https://vercel.com
   - Sign up/login with GitHub

2. **Import Project**
   - Click "New Project"
   - Import your GitHub repository
   - Select the repository

3. **Configure Project**
   - **Framework Preset**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

4. **Environment Variables**
   - Add `VITE_API_URL` with your Render backend URL
   - Example: `https://v-chopz-api.onrender.com`

5. **Deploy**
   - Click "Deploy"
   - Your app will be live at `https://your-app.vercel.app`

#### Option B: Siteground (vchopz.com)

1. **Access cPanel**
   - Login to Siteground
   - Open cPanel

2. **Upload Files**
   - Use File Manager or FTP
   - Upload `frontend/dist` contents to `public_html`

3. **Configure**
   - Update API URL in environment variables to point to Render backend
   - Set `VITE_API_URL` to your Render backend URL
   - Ensure Node.js is enabled if needed
   - Domain: vchopz.com

### 4. Oracle Cloud (Optional - for storage)

If you need additional storage or want to host the backend:

1. **Create Oracle Cloud Account**
2. **Create Compute Instance**
3. **Install Docker**
4. **Deploy using docker-compose**

### 5. Lightning Network Integration (Future)

For payment processing (if you add paid features later):

1. Set up Lightning node
2. Integrate with BTCPay Server or similar
3. Add payment endpoints to backend

## Environment Variables

### Backend (.env)
```
PORT=8000
ALLOWED_ORIGINS=https://vchopz.com
MAX_FILE_SIZE=53687091200  # 50GB (for 24-hour videos)
```

### Frontend (.env.production)
```
VITE_API_URL=https://your-backend-url.onrender.com
```

## Testing Deployment

1. **Test Backend**
   ```bash
   curl https://your-backend-url.onrender.com/
   ```

2. **Test Frontend**
   - Visit your frontend URL
   - Upload a test video
   - Verify splitting works

## Troubleshooting

### ffmpeg not found
- Render free tier doesn't include ffmpeg
- Solution: Use Dockerfile with ffmpeg installed
- Or upgrade to paid plan

### CORS Issues
- Update `ALLOWED_ORIGINS` in backend
- Check CORS middleware configuration

### File Size Limits
- Render has file size limits on free tier (may need paid plan for 24-hour videos)
- Consider using external storage (S3, Oracle Object Storage) for very large files
- Ensure sufficient disk space on server (100GB+ recommended)

### Timeout Issues
- 24-hour videos may timeout on free tier
- Async job processing is implemented - use status endpoint to poll
- Consider upgrading to paid plan for better performance
- Processing 24-hour videos can take 30+ minutes depending on hardware

## Monitoring

- Use Render dashboard for backend logs
- Use Vercel dashboard for frontend analytics
- Set up error tracking (Sentry, etc.)

## Updates

To update the application:

```bash
git add .
git commit -m "Update description"
git push origin main
```

Render and Vercel will automatically redeploy.

