import { useState, useEffect, useCallback, useRef } from 'react'
import { usePhotoStore } from '../store'

export function CompareView() {
  const { photos, selectedIds, setRating, setFlag } = usePhotoStore()
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })

  // Filter photos to only those selected. If none selected, default to first 2 if available.
  let comparePhotos = photos.filter(p => selectedIds.has(p.id))
  if (comparePhotos.length === 0) {
    comparePhotos = photos.slice(0, 2)
  }
  if (comparePhotos.length > 4) {
    comparePhotos = comparePhotos.slice(0, 4) // Max 4 for comparison
  }

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(5, Math.max(0.5, prev * delta)))
  }, [])

  if (comparePhotos.length === 0) {
    return (
      <div className="photo-viewer">
        <div className="empty-state">
          <div className="empty-state-icon">🖼</div>
          <div className="empty-state-title">Select photos to compare</div>
        </div>
      </div>
    )
  }

  return (
    <div className="photo-viewer" style={{ display: 'flex', flexDirection: 'column' }}>
      <div 
        className="compare-container" 
        style={{ 
          display: 'flex', 
          flex: 1, 
          overflow: 'hidden', 
          gap: '2px', 
          background: 'var(--bg-default)' 
        }}
        onWheel={handleWheel}
      >
        {comparePhotos.map((photo) => (
          <div 
            key={photo.id} 
            style={{ 
              flex: 1, 
              position: 'relative', 
              overflow: 'hidden', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              borderRight: '1px solid var(--border-subtle)'
            }}
          >
            <img
              src={'local-file:///' + photo.filePath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}
              alt={photo.fileName}
              style={{
                transform: `scale(${zoom}) translate(${pan.x}px, ${pan.y}px)`,
                transition: 'transform 0.1s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              draggable={false}
            />
            
            {/* Info overlay for each photo */}
            <div style={{
              position: 'absolute',
              bottom: '16px',
              left: '50%',
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(12px)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              zIndex: 10
            }}>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }}>
                {photo.fileName}
              </span>
              <div style={{ display: 'flex', gap: '4px' }}>
                <button
                  className={`btn btn-sm ${photo.flag === 'pick' ? 'btn-success' : ''}`}
                  onClick={() => setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')}
                >
                  ✓
                </button>
                <button
                  className={`btn btn-sm ${photo.flag === 'reject' ? 'btn-danger' : ''}`}
                  onClick={() => setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')}
                >
                  ✕
                </button>
              </div>
              <div className="star-rating">
                {[1, 2, 3, 4, 5].map(s => (
                  <span
                    key={s}
                    className={`star ${s <= photo.rating ? 'filled' : ''}`}
                    onClick={() => setRating(photo.id, s === photo.rating ? 0 : s)}
                  >
                    ★
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
