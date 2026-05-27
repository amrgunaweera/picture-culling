import { useCallback, memo } from 'react'
import { usePhotoStore, useUIStore } from '../store'
import type { Photo } from '../../../../types'

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
  return Math.round(score * 100).toString()
}

interface PhotoCardProps {
  photo: Photo
  index: number
}

export const PhotoCard = memo(function PhotoCard({ photo, index }: PhotoCardProps) {
  const { selectedIds, selectPhoto, setCurrentIndex } = usePhotoStore()
  const { setViewMode } = useUIStore()

  const isSelected = selectedIds.has(photo.id)
  const thumbnailUrl = photo.thumbnailPath
    ? `local-file://${photo.thumbnailPath.replace(/\\/g, '/')}`
    : ''

  const handleClick = useCallback((e: React.MouseEvent) => {
    selectPhoto(photo.id, e.ctrlKey || e.metaKey)
  }, [photo.id])

  const handleDoubleClick = useCallback(() => {
    setCurrentIndex(index)
    setViewMode('loupe')
  }, [index])

  const flagClass = photo.flag === 'pick' ? 'flag-pick' : photo.flag === 'reject' ? 'flag-reject' : ''

  return (
    <div
      className={`photo-card ${isSelected ? 'selected' : ''} ${flagClass} animate-scale-in`}
      style={{ animationDelay: `${Math.min(index * 20, 300)}ms` }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {thumbnailUrl ? (
        <img
          className="photo-card-image"
          src={thumbnailUrl}
          alt={photo.fileName}
          loading="lazy"
        />
      ) : (
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text-disabled)',
          fontSize: '32px'
        }}>
          📷
        </div>
      )}

      <div className="photo-card-overlay">
        <div className="photo-card-top">
          {/* AI Score Badge */}
          {photo.compositeScore !== null && (
            <div className={`ai-score-badge ${getScoreClass(photo.compositeScore)}`}>
              {formatScore(photo.compositeScore)}
            </div>
          )}

          {/* Flag Badge */}
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {photo.flag === 'pick' && <div className="flag-badge pick">✓</div>}
            {photo.flag === 'reject' && <div className="flag-badge reject">✕</div>}
            {photo.duplicateGroupId && <div className="duplicate-badge">DUP</div>}
          </div>
        </div>

        <div className="photo-card-bottom">
          <div className="photo-card-filename">{photo.fileName}</div>

          {/* Star Rating */}
          {photo.rating > 0 && (
            <div className="star-rating">
              {[1, 2, 3, 4, 5].map(s => (
                <span key={s} className={`star ${s <= photo.rating ? 'filled' : ''}`}>★</span>
              ))}
            </div>
          )}

          {/* Color label */}
          {photo.colorLabel !== 'none' && (
            <span className={`color-dot ${photo.colorLabel}`} />
          )}
        </div>
      </div>
    </div>
  )
})
