import { useState, useEffect, useCallback, useRef } from 'react'
import { usePhotoStore, useUIStore } from '../store'
import { IconPhoto, IconChevronLeft, IconChevronRight, IconCheck, IconX, IconStar, IconCamera, IconZoomIn, IconZoomOut } from '@tabler/icons-react'

function getScoreClass(score: number | null): string {
  if (score === null) return ''
  if (score >= 0.8) return 'score-great'
  if (score >= 0.6) return 'score-good'
  if (score >= 0.4) return 'score-ok'
  if (score >= 0.2) return 'score-poor'
  return 'score-bad'
}

function formatScore(score: number | null): string {
  if (score === null) return '—'
  return Math.round(score * 100) + '%'
}

export function PhotoViewer() {
  const { photos, currentIndex, setCurrentIndex, setRating, setFlag } = usePhotoStore()
  const { autoAdvance, setViewMode } = useUIStore()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const startPan = useRef({ x: 0, y: 0 })
  const imageRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)
  const isDragging = useRef(false)
  const hasDragged = useRef(false)
  const startX = useRef(0)
  const scrollLeft = useRef(0)

  useEffect(() => {
    if (filmstripRef.current) {
      const activeEl = filmstripRef.current.querySelector('.filmstrip-item.active') as HTMLElement
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
      }
    }
  }, [currentIndex])

  const photo = photos[currentIndex]

  if (!photo) {
    return (
      <div className="photo-viewer">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <IconPhoto size={48} stroke={1.5} />
          </div>
          <div className="empty-state-title">No photo selected</div>
        </div>
      </div>
    )
  }

  const imageUrl = 'local-file:///' + photo.filePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')

  const goNext = useCallback(() => {
    if (currentIndex < photos.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [currentIndex, photos.length])

  const goPrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1)
      setZoom(1)
      setPan({ x: 0, y: 0 })
    }
  }, [currentIndex])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => {
      const next = Math.min(5, Math.max(0.5, prev * delta))
      if (next <= 1) setPan({ x: 0, y: 0 })
      return next
    })
  }, [])

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (zoom <= 1) return
    if (e.button !== 0) return
    setIsPanning(true)
    startPan.current = { x: e.clientX - pan.x, y: e.clientY - pan.y }
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return
    const x = e.clientX - startPan.current.x
    const y = e.clientY - startPan.current.y
    setPan({ x, y })
  }

  const handleCanvasMouseUp = () => {
    setIsPanning(false)
  }

  const handleImageDoubleClick = () => {
    if (zoom > 1) {
      setZoom(1)
      setPan({ x: 0, y: 0 })
    } else {
      setZoom(2.5)
      setPan({ x: 0, y: 0 })
    }
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!filmstripRef.current) return
    isDragging.current = true
    hasDragged.current = false
    startX.current = e.pageX - filmstripRef.current.offsetLeft
    scrollLeft.current = filmstripRef.current.scrollLeft
  }

  const handleMouseLeave = () => {
    isDragging.current = false
  }

  const handleMouseUp = () => {
    isDragging.current = false
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !filmstripRef.current) return
    if (e.buttons !== 1) {
      isDragging.current = false
      return
    }
    e.preventDefault()
    const x = e.pageX - filmstripRef.current.offsetLeft
    const dist = Math.abs(x - startX.current)
    if (dist > 5) {
      hasDragged.current = true
    }
    const walk = (x - startX.current) * 2
    filmstripRef.current.scrollLeft = scrollLeft.current - walk
  }

  return (
    <div className="photo-viewer">
      <div
        className="photo-viewer-canvas"
        ref={containerRef}
        onWheel={handleWheel}
        onMouseDown={handleCanvasMouseDown}
        onMouseMove={handleCanvasMouseMove}
        onMouseUp={handleCanvasMouseUp}
        onMouseLeave={handleCanvasMouseUp}
        style={{
          cursor: zoom > 1 ? (isPanning ? 'grabbing' : 'grab') : 'default'
        }}
      >
        {/* Overall Rating Display */}
        {photo.compositeScore !== null && (
          <div className="photo-viewer-rating">
            <span className="rating-label">Overall Rating</span>
            <div className={`rating-value-badge ${getScoreClass(photo.compositeScore)}`}>
              {formatScore(photo.compositeScore)}
            </div>
          </div>
        )}

        {/* Zoom Controls */}
        <div className="photo-viewer-zoom-controls">
          <button
            className="btn btn-icon btn-ghost zoom-btn"
            onClick={() => setZoom(prev => {
              const next = Math.max(0.5, prev - 0.25)
              if (next <= 1) setPan({ x: 0, y: 0 })
              return next
            })}
            disabled={zoom <= 0.5}
            title="Zoom Out"
          >
            <IconZoomOut size={16} />
          </button>
          <input
            type="range"
            min={0.5}
            max={5.0}
            step={0.05}
            value={zoom}
            onChange={(e) => {
              const val = Number(e.target.value)
              setZoom(val)
              if (val <= 1) setPan({ x: 0, y: 0 })
            }}
            className="zoom-slider-range"
            title="Drag to zoom"
          />
          <button
            className="btn btn-icon btn-ghost zoom-btn"
            onClick={() => setZoom(prev => Math.min(5.0, prev + 0.25))}
            disabled={zoom >= 5.0}
            title="Zoom In"
          >
            <IconZoomIn size={16} />
          </button>
          <span
            className="zoom-percentage"
            onDoubleClick={() => setZoom(1)}
            title="Double click to reset zoom (100%)"
          >
            {Math.round(zoom * 100)}%
          </span>
        </div>

        {/* Previous button */}
        {currentIndex > 0 && (
          <button
            className="btn btn-icon btn-ghost"
            style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={goPrev}
          >
            <IconChevronLeft size={24} style={{ color: 'white' }} />
          </button>
        )}

        <img
          ref={imageRef}
          className="photo-viewer-image"
          src={imageUrl}
          alt={photo.fileName}
          style={{
            transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`
          }}
          onDoubleClick={handleImageDoubleClick}
          draggable={false}
        />

        {/* Next button */}
        {currentIndex < photos.length - 1 && (
          <button
            className="btn btn-icon btn-ghost"
            style={{
              position: 'absolute',
              right: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 10,
              width: '40px',
              height: '40px',
              background: 'rgba(0,0,0,0.4)',
              backdropFilter: 'blur(8px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onClick={goNext}
          >
            <IconChevronRight size={24} style={{ color: 'white' }} />
          </button>
        )}

        {/* Info overlay */}
        <div style={{
          position: 'absolute',
          bottom: '16px',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(12px)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)'
        }}>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>
            {photo.fileName}
          </span>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            {currentIndex + 1} / {photos.length}
          </span>

          {/* Quick actions */}
          <div style={{ display: 'flex', gap: '4px', marginLeft: '8px' }}>
            <button
              className={`btn btn-sm ${photo.flag === 'pick' ? 'btn-success' : ''}`}
              onClick={() => {
                setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')
                if (autoAdvance) goNext()
              }}
            >
              <IconCheck size={14} /> Pick
            </button>
            <button
              className={`btn btn-sm ${photo.flag === 'reject' ? 'btn-danger' : ''}`}
              onClick={() => {
                setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')
                if (autoAdvance) goNext()
              }}
            >
              <IconX size={14} /> Reject
            </button>
          </div>

          {/* Star rating */}
          <div className="star-rating" style={{ marginLeft: '4px' }}>
            {[1, 2, 3, 4, 5].map(s => (
              <span
                key={s}
                className={`star ${s <= photo.rating ? 'filled' : ''}`}
                onClick={() => setRating(photo.id, s === photo.rating ? 0 : s)}
                style={{ display: 'inline-flex', alignItems: 'center' }}
              >
                <IconStar size={14} fill={s <= photo.rating ? 'currentColor' : 'none'} />
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Filmstrip */}
      <div 
        className="filmstrip" 
        ref={filmstripRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
      >
        {photos.map((p, i) => (
          <div
            key={p.id}
            className={`filmstrip-item ${i === currentIndex ? 'active' : ''}`}
            onClick={(e) => { 
              if (hasDragged.current) {
                e.preventDefault()
                e.stopPropagation()
                return
              }
              setCurrentIndex(i); setZoom(1); setPan({ x: 0, y: 0 }) 
            }}
          >
            {p.thumbnailPath ? (
              <img
                src={'local-file:///' + p.thumbnailPath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}
                alt={p.fileName}
                loading="lazy"
                draggable={false}
              />
            ) : (
              <div style={{
                width: '100%', height: '100%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: 'var(--bg-elevated)', color: 'var(--text-disabled)'
              }}>
                <IconCamera size={20} stroke={1.5} />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
