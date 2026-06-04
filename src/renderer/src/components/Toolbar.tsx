import { useSessionStore, usePhotoStore, useAnalysisStore, useUIStore, useFilterStore } from '../store'
import {
  IconArrowLeft,
  IconFolderOpen,
  IconLayoutGrid,
  IconSquare,
  IconColumns,
  IconCopy,
  IconTrash,
  IconSparkles,
  IconLayoutSidebar,
  IconLoader2
} from '@tabler/icons-react'

export function Toolbar() {
  const { currentSession, openFolder, setCurrentSession } = useSessionStore()
  const { photos, selectedIds, selectAll, clearSelection, deleteRejectedPhotos } = usePhotoStore()
  const rejectedCount = photos.filter(p => p.flag === 'reject').length
  const { startAnalysis, isAnalyzing } = useAnalysisStore()
  const { viewMode, setViewMode, thumbnailSize, setThumbnailSize, toggleSidebar, sidebarVisible } = useUIStore()
  const { filters, setFilter } = useFilterStore()

  const handleDeleteRejected = async () => {
    if (window.confirm('Are you sure you want to move all rejected photos to the Recycle Bin?')) {
      await deleteRejectedPhotos()
    }
  }

  return (
    <div className="toolbar">
      {/* Left: Navigation */}
      <div className="toolbar-group">
        <button
          className="btn btn-ghost"
          onClick={() => setCurrentSession(null)}
          title="Back to sessions"
        >
          <IconArrowLeft size={16} /> Back
        </button>
        <button className="btn btn-ghost" onClick={() => openFolder()}>
          <IconFolderOpen size={16} /> Open Folder
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* View Mode */}
      <div className="toolbar-group">
        <button
          className={`btn btn-icon ${viewMode === 'grid' ? 'active' : ''}`}
          onClick={() => setViewMode('grid')}
          title="Grid View (G)"
        >
          <IconLayoutGrid size={18} />
        </button>
        <button
          className={`btn btn-icon ${viewMode === 'loupe' ? 'active' : ''}`}
          onClick={() => setViewMode('loupe')}
          title="Loupe View (E)"
        >
          <IconSquare size={18} />
        </button>
        <button
          className={`btn btn-icon ${viewMode === 'compare' ? 'active' : ''}`}
          onClick={() => setViewMode('compare')}
          title="Compare Mode (C)"
        >
          <IconColumns size={18} />
        </button>
        <button
          className={`btn btn-icon ${viewMode === 'duplicates' ? 'active' : ''}`}
          onClick={() => setViewMode('duplicates')}
          title="Review Duplicates"
        >
          <IconCopy size={18} />
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Thumbnail Size (Grid only) */}
      {viewMode === 'grid' && (
        <div className="toolbar-group zoom-slider">
          <IconLayoutGrid size={12} style={{ opacity: 0.5 }} />
          <input
            type="range"
            min={0}
            max={2}
            value={thumbnailSize === 'small' ? 0 : thumbnailSize === 'medium' ? 1 : 2}
            onChange={(e) => {
              const v = Number(e.target.value)
              setThumbnailSize(v === 0 ? 'small' : v === 1 ? 'medium' : 'large')
            }}
          />
          <IconLayoutGrid size={16} style={{ opacity: 0.5 }} />
        </div>
      )}

      <div className="toolbar-spacer" />

      {/* Selection */}
      <div className="toolbar-group">
        {selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {selectedIds.size} selected
            </span>
            <button className="btn" onClick={clearSelection}>Clear</button>
          </>
        )}
      </div>

      {/* Delete Rejected */}
      {rejectedCount > 0 && (
        <button
          className="btn btn-danger"
          onClick={handleDeleteRejected}
          title="Move all rejected photos to Recycle Bin"
        >
          <IconTrash size={16} /> Delete Rejected
        </button>
      )}

      {/* AI Analysis */}
      <button
        className="btn btn-primary"
        onClick={() => startAnalysis()}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? (
          <>
            <IconLoader2 size={16} className="animate-spin" /> Analyzing...
          </>
        ) : (
          <>
            <IconSparkles size={16} /> AI Analyze
          </>
        )}
      </button>

      {/* Sidebar toggle */}
      <button
        className={`btn btn-icon ${sidebarVisible ? 'active' : ''}`}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
      >
        <IconLayoutSidebar size={18} />
      </button>
    </div>
  )
}
