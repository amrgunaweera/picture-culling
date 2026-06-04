import { usePhotoStore, useUIStore } from '../store'
import type { ColorLabel } from '../../../types'
import { IconStar, IconCheck, IconX } from '@tabler/icons-react'

function getScoreColor(score: number | null): string {
  if (score === null) return 'var(--text-disabled)'
  if (score >= 0.8) return 'var(--score-great)'
  if (score >= 0.6) return 'var(--score-good)'
  if (score >= 0.4) return 'var(--score-ok)'
  if (score >= 0.2) return 'var(--score-poor)'
  return 'var(--score-bad)'
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  const pct = score !== null ? Math.round(score * 100) : 0

  return (
    <div className="score-bar">
      <span className="score-bar-label">{label}</span>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            background: getScoreColor(score)
          }}
        />
      </div>
      <span className="score-bar-value" style={{ color: getScoreColor(score) }}>
        {score !== null ? pct + '%' : '—'}
      </span>
    </div>
  )
}

export function Sidebar() {
  const { photos, currentIndex, selectedIds, setRating, setFlag, setColorLabel, setCurrentIndex } = usePhotoStore()
  const { viewMode, autoAdvance } = useUIStore()

  // Show info for the current photo in loupe mode, or the first selected in grid mode
  const selectedId = (selectedIds.size > 0 && viewMode !== 'loupe') ? Array.from(selectedIds)[0] : null
  const photo = selectedId
    ? photos.find(p => p.id === selectedId)
    : photos[currentIndex]

  if (!photo) {
    return (
      <div className="sidebar">
        <div className="sidebar-section">
          <div className="sidebar-section-title">Photo Info</div>
          <div style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-xs)' }}>
            Select a photo to view details
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sidebar">
      {/* Thumbnail Preview */}
      <div style={{
        padding: 'var(--space-3)',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        {photo.thumbnailPath && (
          <img
            src={'local-file:///' + photo.thumbnailPath.replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/')}
            alt={photo.fileName}
            style={{
              width: '100%',
              borderRadius: 'var(--radius-md)',
              aspectRatio: '3/2',
              objectFit: 'cover'
            }}
          />
        )}
      </div>

      {/* AI Scores */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">AI Analysis</div>
        <ScoreBar label="Sharpness" score={photo.blurScore} />
        <ScoreBar label="Exposure" score={photo.exposureScore} />
        <ScoreBar label="Aesthetic" score={photo.aestheticScore} />
        <div style={{ marginTop: 'var(--space-3)' }}>
          <ScoreBar label="Overall" score={photo.compositeScore} />
        </div>
        {photo.faceCount !== null && photo.faceCount > 0 && (
          <div className="sidebar-row" style={{ marginTop: 'var(--space-2)' }}>
            <span className="sidebar-label">Faces detected</span>
            <span className="sidebar-value">{photo.faceCount}</span>
          </div>
        )}
      </div>

      {/* Rating & Flag */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Rating</div>
        <div className="star-rating" style={{ fontSize: '18px', gap: '4px', marginBottom: 'var(--space-3)' }}>
          {[1, 2, 3, 4, 5].map(s => (
            <span
              key={s}
              className={`star ${s <= photo.rating ? 'filled' : ''}`}
              onClick={() => setRating(photo.id, s === photo.rating ? 0 : s)}
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
            >
              <IconStar size={16} fill={s <= photo.rating ? 'currentColor' : 'none'} />
            </span>
          ))}
        </div>

        <div className="sidebar-section-title">Flag</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
          <button
            className={`btn btn-sm ${photo.flag === 'pick' ? 'btn-success' : ''}`}
            onClick={() => {
              setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')
              if (autoAdvance && viewMode === 'loupe' && currentIndex < photos.length - 1) {
                setCurrentIndex(currentIndex + 1)
              }
            }}
          >
            <IconCheck size={14} /> Pick
          </button>
          <button
            className={`btn btn-sm ${photo.flag === 'reject' ? 'btn-danger' : ''}`}
            onClick={() => {
              setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')
              if (autoAdvance && viewMode === 'loupe' && currentIndex < photos.length - 1) {
                setCurrentIndex(currentIndex + 1)
              }
            }}
          >
            <IconX size={14} /> Reject
          </button>
          {photo.flag !== 'none' && (
            <button
              className="btn btn-sm"
              onClick={() => setFlag(photo.id, 'none')}
            >
              Clear
            </button>
          )}
        </div>

        <div className="sidebar-section-title">Color Label</div>
        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {(['red', 'yellow', 'green', 'blue', 'purple'] as ColorLabel[]).map(color => (
            <button
              key={color}
              className={`btn btn-icon btn-sm ${photo.colorLabel === color ? 'active' : ''}`}
              style={{
                width: '24px',
                height: '24px',
                borderRadius: 'var(--radius-md)',
                padding: 0
              }}
              onClick={() => setColorLabel(photo.id, photo.colorLabel === color ? 'none' : color)}
            >
              <span className={`color-dot ${color}`} />
            </button>
          ))}
        </div>
      </div>

      {/* EXIF Data */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Camera Info</div>
        {photo.cameraModel && (
          <div className="sidebar-row">
            <span className="sidebar-label">Camera</span>
            <span className="sidebar-value">{photo.cameraModel}</span>
          </div>
        )}
        {photo.lens && (
          <div className="sidebar-row">
            <span className="sidebar-label">Lens</span>
            <span className="sidebar-value">{photo.lens}</span>
          </div>
        )}
        {photo.focalLength && (
          <div className="sidebar-row">
            <span className="sidebar-label">Focal Length</span>
            <span className="sidebar-value">{photo.focalLength}mm</span>
          </div>
        )}
        {photo.aperture && (
          <div className="sidebar-row">
            <span className="sidebar-label">Aperture</span>
            <span className="sidebar-value">f/{photo.aperture}</span>
          </div>
        )}
        {photo.shutterSpeed && (
          <div className="sidebar-row">
            <span className="sidebar-label">Shutter</span>
            <span className="sidebar-value">{photo.shutterSpeed}</span>
          </div>
        )}
        {photo.iso && (
          <div className="sidebar-row">
            <span className="sidebar-label">ISO</span>
            <span className="sidebar-value">{photo.iso}</span>
          </div>
        )}
      </div>

      {/* File Info */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">File Info</div>
        <div className="sidebar-row">
          <span className="sidebar-label">File</span>
          <span className="sidebar-value" style={{ fontSize: 'var(--text-xs)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {photo.fileName}
          </span>
        </div>
        <div className="sidebar-row">
          <span className="sidebar-label">Size</span>
          <span className="sidebar-value">{formatFileSize(photo.fileSize)}</span>
        </div>
        <div className="sidebar-row">
          <span className="sidebar-label">Dimensions</span>
          <span className="sidebar-value">{photo.width} × {photo.height}</span>
        </div>
        {photo.takenAt && (
          <div className="sidebar-row">
            <span className="sidebar-label">Date</span>
            <span className="sidebar-value">{photo.takenAt}</span>
          </div>
        )}
      </div>

      {/* Keyboard Shortcuts */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Shortcuts</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-1)', fontSize: 'var(--text-xs)' }}>
          <span className="sidebar-label"><kbd className="kbd">P</kbd> Pick</span>
          <span className="sidebar-label"><kbd className="kbd">X</kbd> Reject</span>
          <span className="sidebar-label"><kbd className="kbd">1-5</kbd> Rate</span>
          <span className="sidebar-label"><kbd className="kbd">U</kbd> Unflag</span>
          <span className="sidebar-label"><kbd className="kbd">G</kbd> Grid</span>
          <span className="sidebar-label"><kbd className="kbd">E</kbd> Loupe</span>
          <span className="sidebar-label"><kbd className="kbd">←→</kbd> Navigate</span>
          <span className="sidebar-label"><kbd className="kbd">Esc</kbd> Back</span>
        </div>
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(1) + ' ' + units[i]
}
