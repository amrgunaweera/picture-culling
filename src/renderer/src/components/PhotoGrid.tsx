import { usePhotoStore, useUIStore } from '../store'
import { PhotoCard } from './PhotoCard'

export function PhotoGrid() {
  const { photos, isLoading } = usePhotoStore()
  const { thumbnailSize } = useUIStore()

  if (isLoading) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">⏳</div>
        <div className="empty-state-title">Loading photos...</div>
      </div>
    )
  }

  if (photos.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">📷</div>
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
    </div>
  )
}
