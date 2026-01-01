import React, { useState, useEffect, useRef } from 'react'
import { FFmpeg } from '@ffmpeg/ffmpeg'
import { fetchFile, toBlobURL } from '@ffmpeg/util'
import { Video, CheckCircle2, Download } from 'lucide-react'
import './App.css'

// Timeline Segment Component
const TimelineSegment = ({ index, mousePos }) => {
  const segmentRef = useRef(null)
  const [position, setPosition] = useState({
    x: Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 1920),
    y: Math.random() * (typeof window !== 'undefined' ? window.innerHeight : 1080),
    width: 80 + Math.random() * 200,
    angle: Math.random() * 360,
    speed: 0.3 + Math.random() * 0.5,
    direction: Math.random() * 360
  })
  const [illumination, setIllumination] = useState(0)

  useEffect(() => {
    if (!segmentRef.current || !mousePos) return

    const updateIllumination = () => {
      const rect = segmentRef.current.getBoundingClientRect()
      const segmentCenterX = rect.left + rect.width / 2
      const segmentCenterY = rect.top + rect.height / 2

      const dx = mousePos.x - segmentCenterX
      const dy = mousePos.y - segmentCenterY
      const distance = Math.sqrt(dx * dx + dy * dy)

      const maxDistance = 300
      const opacity = Math.max(0, 1 - (distance / maxDistance))
      const glowIntensity = Math.max(0, 1 - (distance / (maxDistance * 0.6)))

      setIllumination({
        opacity: opacity * 0.8,
        glow: glowIntensity
      })
    }

    const interval = setInterval(updateIllumination, 16)
    return () => clearInterval(interval)
  }, [mousePos])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const moveSegment = () => {
      setPosition(prev => {
        const newX = prev.x + Math.cos(prev.direction * Math.PI / 180) * prev.speed
        const newY = prev.y + Math.sin(prev.direction * Math.PI / 180) * prev.speed

        let finalX = newX
        let finalY = newY
        if (newX < -prev.width) finalX = window.innerWidth
        if (newX > window.innerWidth) finalX = -prev.width
        if (newY < -20) finalY = window.innerHeight
        if (newY > window.innerHeight) finalY = -20

        return { ...prev, x: finalX, y: finalY }
      })
    }

    const interval = setInterval(moveSegment, 16)
    return () => clearInterval(interval)
  }, [])

  return (
    <div
      ref={segmentRef}
      className="timeline-segment"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        width: `${position.width}px`,
        transform: `rotate(${position.angle}deg)`,
        animationDelay: `${index * 0.2}s`,
        opacity: illumination.opacity || 0,
        filter: `brightness(${1 + illumination.glow * 0.5}) drop-shadow(0 0 ${illumination.glow * 10}px rgba(102, 126, 234, ${illumination.glow * 0.8}))`,
        transition: 'opacity 0.3s ease, filter 0.3s ease'
      }}
    >
      <div className="timeline-bar"></div>
      <div className="timeline-chop-marks">
        {Array.from({ length: Math.floor(position.width / 30) }, (_, i) => (
          <div key={i} className="chop-mark" style={{ left: `${i * 30}px` }}></div>
        ))}
      </div>
    </div>
  )
}

function App() {
  const [file, setFile] = useState(null)
  const [numSplits, setNumSplits] = useState(2)
  const [processing, setProcessing] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [error, setError] = useState(null)
  const [videoDuration, setVideoDuration] = useState(null)
  const [progress, setProgress] = useState(0)
  const [progressMessage, setProgressMessage] = useState('')
  const [isHolding, setIsHolding] = useState(false)
  const [holdProgress, setHoldProgress] = useState(0)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [particles, setParticles] = useState([])
  const [segments, setSegments] = useState([])
  const [ffmpegLoaded, setFfmpegLoaded] = useState(false)
  const [ffmpegLoading, setFfmpegLoading] = useState(false)

  const holdIntervalRef = useRef(null)
  const fileInputRef = useRef(null)
  const orbRef = useRef(null)
  const ffmpegRef = useRef(null)

  // Initialize FFmpeg
  useEffect(() => {
    const loadFFmpeg = async () => {
      if (ffmpegRef.current || ffmpegLoading) return

      setFfmpegLoading(true)
      try {
        const ffmpeg = new FFmpeg()
        ffmpegRef.current = ffmpeg

        ffmpeg.on('log', ({ message }) => {
          console.log('[FFmpeg]', message)
        })

        ffmpeg.on('progress', ({ progress: p }) => {
          // Progress is per-segment, so we'll handle it in the split function
        })

        // Load FFmpeg WASM
        const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm'
        await ffmpeg.load({
          coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        })

        setFfmpegLoaded(true)
        console.log('FFmpeg loaded successfully')
      } catch (err) {
        console.error('Failed to load FFmpeg:', err)
        setError('Failed to load video processor. Please refresh the page.')
      } finally {
        setFfmpegLoading(false)
      }
    }

    loadFFmpeg()
  }, [])

  // Track mouse movement
  useEffect(() => {
    let rafId = null
    let targetX = 0
    let targetY = 0

    const updateOrbPosition = () => {
      if (orbRef.current) {
        orbRef.current.style.transform = `translate(calc(${targetX}px - 50%), calc(${targetY}px - 50%))`
      }
      rafId = null
    }

    const handleMouseMove = (e) => {
      targetX = e.clientX
      targetY = e.clientY
      setMousePos({ x: e.clientX, y: e.clientY })

      if (!rafId) {
        rafId = requestAnimationFrame(updateOrbPosition)
      }
    }

    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      if (rafId) cancelAnimationFrame(rafId)
    }
  }, [])

  // Create particles
  const createParticle = (x, y) => {
    const particle = {
      id: Date.now() + Math.random(),
      x, y,
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

  // Get video duration
  const getVideoDuration = (file) => {
    return new Promise((resolve) => {
      const video = document.createElement('video')
      video.preload = 'metadata'
      video.onloadedmetadata = () => {
        resolve(video.duration)
        URL.revokeObjectURL(video.src)
      }
      video.onerror = () => resolve(null)
      video.src = URL.createObjectURL(file)
    })
  }

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0]
    if (selectedFile) {
      const maxSize = 10 * 1024 * 1024 * 1024 // 10GB for browser processing
      if (selectedFile.size > maxSize) {
        setError('File size must be less than 10GB for browser processing')
        return
      }
      setFile(selectedFile)
      setError(null)
      setCompleted(false)
      setProgress(0)
      setSegments([])

      // Get video duration
      const duration = await getVideoDuration(selectedFile)
      setVideoDuration(duration)
      createParticle(mousePos.x, mousePos.y)
    }
  }

  const handleMouseDown = () => {
    if (!file && !processing) {
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

  const handleSplit = async () => {
    if (!file || !ffmpegLoaded) {
      setError(ffmpegLoaded ? 'Please select a video file' : 'Video processor is still loading...')
      return
    }

    if (numSplits < 1 || numSplits > 12) {
      setError('Number of splits must be between 1 and 12')
      return
    }

    setProcessing(true)
    setError(null)
    setProgress(0)
    setProgressMessage('Loading video...')
    setSegments([])

    try {
      const ffmpeg = ffmpegRef.current
      const inputFileName = 'input.mp4'

      // Write input file to FFmpeg virtual filesystem
      setProgressMessage('Preparing video...')
      const fileData = await fetchFile(file)
      await ffmpeg.writeFile(inputFileName, fileData)

      // Get duration for splitting
      const duration = videoDuration || 60
      const segmentDuration = duration / numSplits
      const outputSegments = []

      for (let i = 0; i < numSplits; i++) {
        const startTime = i * segmentDuration
        const outputFileName = `segment_${String(i + 1).padStart(2, '0')}.mp4`

        setProgressMessage(`Processing chop ${i + 1} of ${numSplits}...`)
        setProgress(Math.round((i / numSplits) * 100))

        // FFmpeg command to split segment with watermark text
        await ffmpeg.exec([
          '-ss', String(startTime),
          '-i', inputFileName,
          '-t', String(segmentDuration),
          '-vf', `drawtext=text='V-Chopz by VLTRN':fontsize=24:fontcolor=white@0.7:x=w-tw-20:y=h-th-20`,
          '-c:v', 'libx264',
          '-preset', 'ultrafast',
          '-c:a', 'aac',
          '-movflags', '+faststart',
          '-y',
          outputFileName
        ])

        // Read the output file
        const data = await ffmpeg.readFile(outputFileName)
        const blob = new Blob([data.buffer], { type: 'video/mp4' })
        const url = URL.createObjectURL(blob)

        outputSegments.push({
          name: outputFileName,
          url: url,
          number: i + 1
        })

        setProgress(Math.round(((i + 1) / numSplits) * 100))
        createParticle(mousePos.x, mousePos.y)
      }

      // Cleanup input file
      await ffmpeg.deleteFile(inputFileName)

      setSegments(outputSegments)
      setCompleted(true)
      setProcessing(false)
      setProgressMessage('Complete!')
      createParticle(mousePos.x, mousePos.y)

    } catch (err) {
      console.error('Processing error:', err)
      setError('Video processing failed: ' + (err.message || 'Unknown error'))
      setProcessing(false)
    }
  }

  const handleDownloadSegment = (segment) => {
    const link = document.createElement('a')
    link.href = segment.url
    link.download = segment.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    createParticle(mousePos.x, mousePos.y)
  }

  const handleDownloadAll = async () => {
    // Download each segment
    for (const segment of segments) {
      handleDownloadSegment(segment)
      await new Promise(resolve => setTimeout(resolve, 500)) // Stagger downloads
    }
  }

  const handleReset = () => {
    // Revoke all blob URLs
    segments.forEach(s => URL.revokeObjectURL(s.url))

    setFile(null)
    setCompleted(false)
    setError(null)
    setVideoDuration(null)
    setNumSplits(2)
    setProgress(0)
    setProgressMessage('')
    setSegments([])
    if (fileInputRef.current) fileInputRef.current.value = ''
    createParticle(mousePos.x, mousePos.y)
  }

  useEffect(() => {
    return () => {
      if (holdIntervalRef.current) {
        clearInterval(holdIntervalRef.current)
      }
      // Cleanup blob URLs on unmount
      segments.forEach(s => URL.revokeObjectURL(s.url))
    }
  }, [segments])

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
        <div ref={orbRef} className="gradient-orb"></div>
        <div className="timeline-container">
          {Array.from({ length: 15 }, (_, i) => (
            <TimelineSegment key={i} index={i} mousePos={mousePos} />
          ))}
        </div>
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
              {ffmpegLoading && (
                <p className="loading-indicator">loading video processor...</p>
              )}
            </div>

            {/* Upload Section */}
            {!file ? (
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
                  <div className="file-icon">
                    <Video size={48} strokeWidth={1.5} />
                  </div>
                  <p className="file-name">{file.name}</p>
                  <p className="file-size">{formatFileSize(file.size)}</p>
                  {videoDuration && (
                    <p className="duration-text">{formatDuration(videoDuration)}</p>
                  )}
                </div>

                <div className="split-controls-creative">
                  <p className="split-label">how many chopz?</p>
                  <div className="number-selector">
                    <button
                      className="num-btn"
                      onClick={() => setNumSplits(Math.max(1, numSplits - 1))}
                      disabled={numSplits <= 1 || processing}
                    >
                      −
                    </button>
                    <div className="num-display">{numSplits}</div>
                    <button
                      className="num-btn"
                      onClick={() => setNumSplits(Math.min(12, numSplits + 1))}
                      disabled={numSplits >= 12 || processing}
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

                {processing ? (
                  <div className="processing-state">
                    <div className="processing-ring">
                      <div className="spinner"></div>
                    </div>
                    <p className="processing-text">{progressMessage || 'processing...'}</p>
                    <div className="processing-progress">
                      <div
                        className="progress-fill-creative"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="progress-percent-creative">{progress}%</p>
                  </div>
                ) : (
                  <button
                    onClick={handleSplit}
                    className="btn-split"
                    disabled={!ffmpegLoaded}
                  >
                    {ffmpegLoaded ? 'chop it' : 'loading...'}
                  </button>
                )}

                {!processing && (
                  <button onClick={handleReset} className="btn-reset-small">
                    choose different video
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
              <div className="completion-icon">
                <CheckCircle2 size={64} strokeWidth={1.5} />
              </div>
              <h2 className="completion-title">all done</h2>
              <p className="completion-subtitle">{numSplits} chopz ready</p>
            </div>

            <div className="download-options">
              <button
                onClick={handleDownloadAll}
                className="btn-download-main"
              >
                download all
              </button>

              <div className="segment-list">
                {segments.map((segment) => (
                  <button
                    key={segment.number}
                    onClick={() => handleDownloadSegment(segment)}
                    className="btn-segment-creative"
                  >
                    {segment.number}
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
