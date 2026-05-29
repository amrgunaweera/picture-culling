import { useEffect } from 'react'
import { usePhotoStore, useUIStore, useFilterStore } from '../store'

export function useKeyboardShortcuts() {
  const { photos, currentIndex, setCurrentIndex, setRating, setFlag, selectAll, clearSelection } = usePhotoStore()
  const { viewMode, setViewMode, autoAdvance } = useUIStore()
  const { loadPhotos } = usePhotoStore()

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle shortcuts when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLSelectElement) {
        return
      }

      const photo = photos[currentIndex]
      if (!photo && !['g', 'e'].includes(e.key.toLowerCase())) return

      const goNext = () => {
        if (currentIndex < photos.length - 1) {
          setCurrentIndex(currentIndex + 1)
        }
      }

      switch (e.key.toLowerCase()) {
        // Navigation
        case 'arrowleft':
          e.preventDefault()
          if (currentIndex > 0) setCurrentIndex(currentIndex - 1)
          break

        case 'arrowright':
          e.preventDefault()
          goNext()
          break

        // View modes
        case 'g':
          e.preventDefault()
          setViewMode('grid')
          break

        case 'e':
        case 'enter':
          e.preventDefault()
          if (viewMode === 'grid') setViewMode('loupe')
          break

        case 'c':
          e.preventDefault()
          setViewMode(viewMode === 'compare' ? 'grid' : 'compare')
          break

        case 'escape':
          e.preventDefault()
          if (viewMode !== 'grid') {
            setViewMode('grid')
          } else {
            clearSelection()
          }
          break

        // Rating (1-5)
        case '1': case '2': case '3': case '4': case '5':
          if (photo) {
            e.preventDefault()
            const rating = parseInt(e.key)
            setRating(photo.id, photo.rating === rating ? 0 : rating)
          }
          break

        case '0':
          if (photo) {
            e.preventDefault()
            setRating(photo.id, 0)
          }
          break

        // Flagging
        case 'p':
          if (photo) {
            e.preventDefault()
            setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')
            if (autoAdvance) goNext()
          }
          break

        case 'x':
        case 'delete':
          if (photo) {
            e.preventDefault()
            setFlag(photo.id, photo.flag === 'reject' ? 'none' : 'reject')
            if (autoAdvance) goNext()
          }
          break

        case 'u':
          if (photo) {
            e.preventDefault()
            setFlag(photo.id, 'none')
          }
          break

        case ' ': // Space = toggle pick
          if (photo) {
            e.preventDefault()
            setFlag(photo.id, photo.flag === 'pick' ? 'none' : 'pick')
            if (autoAdvance) goNext()
          }
          break

        // Select all
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault()
            selectAll()
          }
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [photos, currentIndex, viewMode, autoAdvance])
}
