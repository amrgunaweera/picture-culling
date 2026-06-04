import { usePhotoStore, useUIStore } from '../store'
import { PhotoCard } from './PhotoCard'
import { IconLoader2, IconCamera, IconColumns, IconX } from '@tabler/icons-react'

export function PhotoGrid() {
  const { photos, isLoading, selectedIds, clearSelection } = usePhotoStore()
  const { thumbnailSize, setViewMode } = useUIStore()

  const selectedCount = selectedIds.size
  const canCompare = selectedCount >= 2 && selectedCount <= 4

  const handleCompare = () => {
    setViewMode('compare')
  }

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <IconLoader2 size={48} className="animate-spin" />
        </div>
        <div className="empty-state-title">Loading photos...</div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon" style={{ display: 'flex', justifyContent: 'center' }}>
          <IconCamera size={48} stroke={1.5} />
        </div>
        <div className="empty-state-title">No photos found</div>
        <div className="empty-state-text">
          Try adjusting your filters or run AI Analysis to get started
        </div>
      </div>
    )
  }

  return (
    <div className="photo-grid-container">
      <div className={`photo-grid size-${thumbnailSize}`}>
        {photos.map((photo, index) => (
          <PhotoCard key={photo.id} photo={photo} index={index} />
        ))}
      </div>

      {/* Floating compare action bar */}
      {selectedCount >= 2 && (
        <div className="compare-action-bar" key={selectedCount}>
          <div className="compare-action-bar-label">
            <IconColumns size={15} />
            <span><strong>{selectedCount}</strong> photos selected</span>
          </div>
          {canCompare ? (
            <button className="btn btn-primary" onClick={handleCompare}>
              <IconColumns size={15} /> Compare
            </button>
          ) : (
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-warning)' }}>
              Max 4 photos for compare
            </span>
          )}
          <button
            className="btn btn-ghost btn-icon"
            onClick={clearSelection}
            title="Clear selection"
          >
            <IconX size={14} />
          </button>
        </div>
      )}
    </div>
  )
}
