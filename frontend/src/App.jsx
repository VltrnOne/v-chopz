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
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState([])
  const pollIntervalRef = useRef(null)
  const holdIntervalRef = useRef(null)
  const fileInputRef = useRef(null)

  // Track mouse movement for interactive effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [])

  // Create particles on interaction
  const createParticle = (x, y) => {
    const particle = {
      id: Date.now() + Math.random(),
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 1
    }
    setParticles(prev => [...prev, particle])
    
    setTimeout(() => {
      setParticles(prev => prev.filter(p => p.id !== particle.id))
    }, 1000)
  }

  // Update particles
  useEffect(() => {
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02
        })).filter(p => p.life > 0)
      )
    }, 16)
    return () => clearInterval(interval)
  }, [])

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
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
      createParticle(mousePos.x, mousePos.y)
    }
  }

  const handleMouseDown = () => {
    if (!file) {
      setIsHolding(true)
      setHoldProgress(0)
      holdIntervalRef.current = setInterval(() => {
        setHoldProgress(prev => {
          if (prev >= 100) {
            if (fileInputRef.current) {
              fileInputRef.current.click()
            }
            setIsHolding(false)
            clearInterval(holdIntervalRef.current)
            return 100
          }
          return prev + 2
        })
      }, 20)
    }
  }

  const handleMouseUp = () => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current)
      setIsHolding(false)
      setHoldProgress(0)
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
      createParticle(mousePos.x, mousePos.y)
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
      await axios.post(`${API_URL}/split/${jobId}`, null, {
        params: { num_splits: numSplits },
      })
      startPolling()
      createParticle(mousePos.x, mousePos.y)
    } catch (err) {
      setError(err.response?.data?.detail || 'Splitting failed')
      setSplitting(false)
      stopPolling()
    }
  }

  const startPolling = () => {
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
          createParticle(mousePos.x, mousePos.y)
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

  useEffect(() => {
    return () => {
      stopPolling()
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
      }
    }
  }, [])

  const handleDownloadAll = () => {
    if (!jobId) return
    window.open(`${API_URL}/download-all/${jobId}`, '_blank')
    createParticle(mousePos.x, mousePos.y)
  }

  const handleDownloadSegment = (segmentNum) => {
    if (!jobId) return
    window.open(`${API_URL}/download/${jobId}?segment=${segmentNum}`, '_blank')
    createParticle(mousePos.x, mousePos.y)
  }

  const handleReset = () => {
    setFile(null)
    setJobId(null)
    setCompleted(false)
    setError(null)
    setVideoDuration(null)
    setNumSplits(2)
    if (fileInputRef.current) fileInputRef.current.value = ''
    createParticle(mousePos.x, mousePos.y)
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
      {/* Animated background */}
      <div className="background">
        <div className="gradient-orb" style={{ left: `${mousePos.x}px`, top: `${mousePos.y}px` }}></div>
      </div>

      {/* Particles */}
      {particles.map(particle => (
        <div
          key={particle.id}
          className="particle"
          style={{
            left: `${particle.x}px`,
            top: `${particle.y}px`,
            opacity: particle.life,
            transform: `scale(${particle.life})`
          }}
        />
      ))}

      <div className="container">
        {!completed ? (
          <>
            {/* Header */}
            <div className="header">
              <h1 className="title-main">V-Chopz</h1>
              <p className="subtitle-main">chop your videos</p>
            </div>

            {/* Upload Section */}
            {!jobId ? (
              <div className="upload-section">
                <input
                  ref={fileInputRef}
                  id="file-input"
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  className="file-input-hidden"
                />
                
                <div 
                  className="upload-zone"
                  onMouseDown={handleMouseDown}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  onTouchStart={handleMouseDown}
                  onTouchEnd={handleMouseUp}
                >
                  {!file ? (
                    <>
                      <div className="upload-instruction">
                        {isHolding ? (
                          <>
                            <div className="hold-progress-ring">
                              <svg className="progress-svg" viewBox="0 0 100 100">
                                <circle
                                  className="progress-circle"
                                  cx="50"
                                  cy="50"
                                  r="45"
                                  style={{
                                    strokeDasharray: `${2 * Math.PI * 45}`,
                                    strokeDashoffset: `${2 * Math.PI * 45 * (1 - holdProgress / 100)}`
                                  }}
                                />
                              </svg>
                            </div>
                            <p className="hold-text">hold</p>
                          </>
                        ) : (
                          <>
                            <p className="click-text">click & hold</p>
                            <p className="click-subtext">to select video</p>
                          </>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="file-selected">
                      <div className="file-icon">📹</div>
                      <p className="file-name">{file.name}</p>
                      <p className="file-size">{formatFileSize(file.size)}</p>
                      {uploading && (
                        <div className="upload-progress">
                          <div className="progress-bar-mini">
                            <div 
                              className="progress-fill-mini" 
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="progress-percent">{uploadProgress}%</p>
                        </div>
                      )}
                      {!uploading && (
                        <button
                          onClick={handleUpload}
                          className="btn-upload"
                        >
                          upload
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {error && (
                  <div className="error-display">
                    {error}
                  </div>
                )}
              </div>
            ) : (
              /* Split Configuration */
              <div className="split-section">
                <div className="success-indicator">
                  <div className="check-mark">✓</div>
                  <p className="success-text">ready</p>
                  {videoDuration && (
                    <p className="duration-text">{formatDuration(videoDuration)}</p>
                  )}
                </div>

                <div className="split-controls-creative">
                  <p className="split-label">how many pieces?</p>
                  <div className="number-selector">
                    <button
                      className="num-btn"
                      onClick={() => setNumSplits(Math.max(1, numSplits - 1))}
                      disabled={numSplits <= 1}
                    >
                      −
                    </button>
                    <div className="num-display">{numSplits}</div>
                    <button
                      className="num-btn"
                      onClick={() => setNumSplits(Math.min(12, numSplits + 1))}
                      disabled={numSplits >= 12}
                    >
                      +
                    </button>
                  </div>
                  {videoDuration && (
                    <p className="segment-preview">
                      ~{formatDuration(videoDuration / numSplits)} each
                    </p>
                  )}
                </div>

                {splitting ? (
                  <div className="processing-state">
                    <div className="processing-ring">
                      <div className="spinner"></div>
                    </div>
                    <p className="processing-text">{splitStatus || 'processing...'}</p>
                    <div className="processing-progress">
                      <div 
                        className="progress-fill-creative" 
                        style={{ width: `${splitProgress}%` }}
                      />
                    </div>
                    <p className="progress-percent-creative">{splitProgress}%</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSplit}
                    className="btn-split"
                  >
                    chop it
                  </button>
                )}

                {error && (
                  <div className="error-display">
                    {error}
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          /* Completion Screen */
          <div className="completion-section">
            <div className="completion-header">
              <div className="completion-icon">✨</div>
              <h2 className="completion-title">all done</h2>
              <p className="completion-subtitle">{numSplits} pieces ready</p>
            </div>

            <div className="download-options">
              <button
                onClick={handleDownloadAll}
                className="btn-download-main"
              >
                download all
              </button>

              <div className="segment-list">
                {Array.from({ length: numSplits }, (_, i) => (
                  <button
                    key={i + 1}
                    onClick={() => handleDownloadSegment(i + 1)}
                    className="btn-segment-creative"
                  >
                    {i + 1}
                  </button>
                ))}
              </div>
            </div>

            <button 
              onClick={handleReset} 
              className="btn-restart"
            >
              restart
            </button>

            <p className="watermark-note">
              watermarked with "V-Chopz by VLTRN"
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
