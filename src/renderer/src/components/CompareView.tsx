import { useState, useCallback } from 'react'
import { usePhotoStore, useUIStore } from '../store'
import { IconCheck, IconX, IconStar, IconLayoutGrid, IconColumns } from '@tabler/icons-react'

export function CompareView() {
  const { photos, selectedIds, setSelectedPhotos, setRating, setFlag } = usePhotoStore()
  const { setViewMode } = useUIStore()
  const [zoom, setZoom] = useState(1)

  // Build compare set: use selectedIds if valid (2–4), otherwise first 2
  let comparePhotos = photos.filter(p => selectedIds.has(p.id))
  if (comparePhotos.length === 0) comparePhotos = photos.slice(0, 2)
  if (comparePhotos.length > 4) comparePhotos = comparePhotos.slice(0, 4)

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(5, Math.max(0.5, prev * delta)))
  }, [])

  const handleRemove = (id: number) => {
    const remaining = comparePhotos.filter(p => p.id !== id).map(p => p.id)
    setSelectedPhotos(remaining)
    if (remaining.length < 2) {
      setViewMode('grid')
    }
  }

  const handleBackToGrid = () => {
    setViewMode('grid')
  }

  if (comparePhotos.length === 0) {
    return (
      <div className="photo-viewer">
        <div className="empty-state">
          <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
            <IconColumns size={48} stroke={1.5} />
          </div>
          <div className="empty-state-title">No photos selected</div>
          <div className="empty-state-text" style={{ marginBottom: '20px' }}>
            Go back to the grid and select 2–4 photos using the checkboxes, then click <strong>Compare</strong>.
          </div>
          <button className="btn btn-primary" onClick={handleBackToGrid}>
            <IconLayoutGrid size={16} /> Back to Grid
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="photo-viewer" style={{ display: 'flex', flexDirection: 'column' }}>
      {/* Header bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '6px 12px',
        background: 'var(--bg-tertiary)',
        borderBottom: '1px solid var(--border-subtle)',
        flexShrink: 0
      }}>
        <button className="btn btn-ghost" onClick={handleBackToGrid}>
          <IconLayoutGrid size={15} /> Grid
        </button>
        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
          Comparing <strong style={{ color: 'var(--accent-secondary)' }}>{comparePhotos.length}</strong> photos
          &nbsp;·&nbsp; Scroll to zoom &nbsp;·&nbsp; Remove a photo by hovering and clicking ✕
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
            Zoom: {Math.round(zoom * 100)}%
          </span>
          <button className="btn btn-ghost btn-sm" onClick={() => setZoom(1)}>Reset</button>
        </div>
      </div>

      {/* Compare panels */}
      <div
        style={{
          display: 'flex',
          flex: 1,
          overflow: 'hidden',
          gap: '2px',
          background: 'var(--bg-primary)'
        }}
        onWheel={handleWheel}
      >
        {comparePhotos.map((photo) => (
          <div
            key={photo.id}
            className="compare-panel"
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
                transform: `scale(${zoom})`,
                transition: 'transform 0.1s ease-out',
                maxWidth: '100%',
                maxHeight: '100%',
                objectFit: 'contain'
              }}
              draggable={false}
            />

            {/* Remove button (top-right, shows on hover) */}
            <button
              className="compare-remove-btn"
              onClick={() => handleRemove(photo.id)}
              title="Remove from comparison"
            >
              <IconX size={13} />
            </button>

            {/* Info overlay */}
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
                  title="Pick"
                >
                  <IconCheck size={14} />
                </button>
                <button
                  className={`btn btn-sm ${photo.flag === 'reject' ? 'btn-danger' : ''}`}
                  onClick={() => setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')}
                  title="Reject"
                >
                  <IconX size={14} />
                </button>
              </div>
              <div className="star-rating">
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
        ))}
      </div>
    </div>
  )
}
