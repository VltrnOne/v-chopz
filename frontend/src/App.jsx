import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

function App() {
  const [file, setFile] = useState(null)
  const [numSplits, setNumSplits] = useState(2)
  const [jobId, setJobId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [splitting, setSplitting] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [splitProgress, setSplitProgress] = useState(0)
  const [splitStatus, setSplitStatus] = useState(null)
  const pollIntervalRef = useRef(null)

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      // Support videos up to 24 hours (50GB limit)
      const maxSize = 50 * 1024 * 1024 * 1024 // 50GB
      if (selectedFile.size > maxSize) {
        setError(`File size must be less than ${(maxSize / (1024**3)).toFixed(1)}GB`)
        return
      }
      setFile(selectedFile)
      setError(null)
      setJobId(null)
      setCompleted(false)
      setUploadProgress(0)
      setSplitProgress(0)
    }
  }

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a video file')
      return
    }

    setUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await axios.post(`${API_URL}/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            )
            setUploadProgress(percentCompleted)
          }
        },
      })

      setJobId(response.data.job_id)
      setVideoDuration(response.data.duration)
      setUploading(false)
      setUploadProgress(100)
    } catch (err) {
      setError(err.response?.data?.detail || 'Upload failed')
      setUploading(false)
      setUploadProgress(0)
    }
  }

  const handleSplit = async () => {
    if (!jobId) {
      setError('Please upload a video first')
      return
    }

    if (numSplits < 1 || numSplits > 12) {
      setError('Number of splits must be between 1 and 12')
      return
    }

    setSplitting(true)
    setError(null)
    setSplitProgress(0)
    setSplitStatus('Starting...')

    try {
      // Start the split job
      await axios.post(`${API_URL}/split/${jobId}`, null, {
        params: { num_splits: numSplits },
      })

      // Start polling for status
      startPolling()
    } catch (err) {
      setError(err.response?.data?.detail || 'Splitting failed')
      setSplitting(false)
      stopPolling()
    }
  }

  const startPolling = () => {
    // Poll every 2 seconds
    pollIntervalRef.current = setInterval(async () => {
      try {
        const response = await axios.get(`${API_URL}/status/${jobId}`)
        const status = response.data

        setSplitStatus(status.message)
        setSplitProgress(status.progress_percent || 0)

        if (status.status === 'completed') {
          setCompleted(true)
          setSplitting(false)
          stopPolling()
        } else if (status.status === 'failed') {
          setError(status.message || 'Video splitting failed')
          setSplitting(false)
          stopPolling()
        }
      } catch (err) {
        console.error('Error polling status:', err)
      }
    }, 2000)
  }

  const stopPolling = () => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current)
      pollIntervalRef.current = null
    }
  }

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      stopPolling()
    }
  }, [])

  const handleDownloadAll = () => {
    if (!jobId) return
    window.open(`${API_URL}/download-all/${jobId}`, '_blank')
  }

  const handleDownloadSegment = (segmentNum) => {
    if (!jobId) return
    window.open(`${API_URL}/download/${jobId}?segment=${segmentNum}`, '_blank')
  }

  const handleReset = () => {
    setFile(null)
    setJobId(null)
    setCompleted(false)
    setError(null)
    setVideoDuration(null)
    setNumSplits(2)
    // Reset file input
    const fileInput = document.getElementById('file-input')
    if (fileInput) fileInput.value = ''
  }

  const formatDuration = (seconds) => {
    if (!seconds) return ''
    const hours = Math.floor(seconds / 3600)
    const mins = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    
    if (hours > 0) {
      return `${hours}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB'
    if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB'
    return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
  }

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>V-Chopz</h1>
          <p className="subtitle">Split your videos into equal segments - 100% Free</p>
        </header>

        <div className="card">
          {!completed ? (
            <>
              <div className="section">
                <h2>Step 1: Upload Video</h2>
                <div className="upload-area">
                  <input
                    id="file-input"
                    type="file"
                    accept="video/*"
                    onChange={handleFileChange}
                    className="file-input"
                  />
                  {file && (
                    <div className="file-info">
                      <p>📹 {file.name}</p>
                      <p className="file-size">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  )}
                  {uploading && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">Uploading: {uploadProgress}%</p>
                    </div>
                  )}
                </div>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading}
                  className="btn btn-primary"
                >
                  {uploading ? 'Uploading...' : 'Upload Video'}
                </button>
              </div>

              {jobId && (
                <div className="section">
                  <div className="success-message">
                    ✅ Video uploaded successfully!
                    {videoDuration && (
                      <span className="duration">
                        Duration: {formatDuration(videoDuration)}
                      </span>
                    )}
                  </div>

                  <h2>Step 2: Choose Number of Segments</h2>
                  <div className="split-controls">
                    <label>
                      Number of segments (1-12):
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={numSplits}
                        onChange={(e) =>
                          setNumSplits(parseInt(e.target.value) || 2)
                        }
                        className="number-input"
                      />
                    </label>
                    {videoDuration && (
                      <p className="segment-info">
                        Each segment will be approximately{' '}
                        {formatDuration(videoDuration / numSplits)} long
                      </p>
                    )}
                  </div>
                  {splitting && (
                    <div className="progress-container">
                      <div className="progress-bar">
                        <div 
                          className="progress-fill" 
                          style={{ width: `${splitProgress}%` }}
                        ></div>
                      </div>
                      <p className="progress-text">
                        {splitStatus || 'Processing...'}: {splitProgress}%
                      </p>
                    </div>
                  )}
                  <button
                    onClick={handleSplit}
                    disabled={splitting}
                    className="btn btn-primary"
                  >
                    {splitting ? 'Processing...' : 'Split Video'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="section">
              <div className="success-message large">
                ✅ Video split successfully into {numSplits} segments!
              </div>
              <p className="info-text">
                Each segment has been watermarked with "V-Chopz by VLTRN" in the bottom right
                corner.
              </p>

              <div className="download-section">
                <button
                  onClick={handleDownloadAll}
                  className="btn btn-success"
                >
                  📦 Download All Segments (ZIP)
                </button>

                <div className="segment-buttons">
                  <p>Or download individual segments:</p>
                  <div className="segment-grid">
                    {Array.from({ length: numSplits }, (_, i) => (
                      <button
                        key={i + 1}
                        onClick={() => handleDownloadSegment(i + 1)}
                        className="btn btn-segment"
                      >
                        Segment {i + 1}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <button onClick={handleReset} className="btn btn-secondary">
                Split Another Video
              </button>
            </div>
          )}

          {error && (
            <div className="error-message">
              ❌ {error}
            </div>
          )}
        </div>

        <footer className="footer">
          <p>Powered by V-Chopz • Free Video Splitting Tool</p>
        </footer>
      </div>
    </div>
  )
}

export default App

