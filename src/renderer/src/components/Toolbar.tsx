import { useSessionStore, usePhotoStore, useAnalysisStore, useUIStore, useFilterStore } from '../store'

export function Toolbar() {
  const { currentSession, openFolder, setCurrentSession } = useSessionStore()
  const { photos, selectedIds, selectAll, clearSelection } = usePhotoStore()
  const { startAnalysis, isAnalyzing } = useAnalysisStore()
  const { viewMode, setViewMode, thumbnailSize, setThumbnailSize, toggleSidebar, sidebarVisible, autoAdvance, toggleAutoAdvance } = useUIStore()
  const { filters, setFilter } = useFilterStore()

  return (
    <div className="toolbar">
      {/* Left: Navigation */}
      <div className="toolbar-group">
        <button
          className="btn btn-ghost"
          onClick={() => setCurrentSession(null)}
          title="Back to sessions"
        >
          ← Back
        </button>
        <button className="btn btn-ghost" onClick={() => openFolder()}>
          📁 Open Folder
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
          ▦
        </button>
        <button
          className={`btn btn-icon ${viewMode === 'loupe' ? 'active' : ''}`}
          onClick={() => setViewMode('loupe')}
          title="Loupe View (E)"
        >
          ◻
        </button>
      </div>

      <div className="toolbar-separator" />

      {/* Thumbnail Size (Grid only) */}
      {viewMode === 'grid' && (
        <div className="toolbar-group zoom-slider">
          <span style={{ fontSize: '10px', opacity: 0.5 }}>▦</span>
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
          <span style={{ fontSize: '14px', opacity: 0.5 }}>▦</span>
        </div>
      )}

      {/* Sort */}
      <div className="toolbar-group">
        <select
          className="select"
          value={filters.sortBy || 'compositeScore'}
          onChange={(e) => setFilter('sortBy', e.target.value as any)}
        >
          <option value="compositeScore">AI Score</option>
          <option value="takenAt">Date Taken</option>
          <option value="fileName">File Name</option>
          <option value="rating">Rating</option>
          <option value="blurScore">Sharpness</option>
          <option value="fileSize">File Size</option>
        </select>
        <button
          className="btn btn-icon"
          onClick={() =>
            setFilter('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc')
          }
          title={filters.sortDirection === 'asc' ? 'Ascending' : 'Descending'}
        >
          {filters.sortDirection === 'asc' ? '↑' : '↓'}
        </button>
      </div>

      <div className="toolbar-spacer" />

      {/* Selection */}
      <div className="toolbar-group">
        {selectedIds.size > 0 && (
          <>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)' }}>
              {selectedIds.size} selected
            </span>
            <button className="btn btn-sm" onClick={clearSelection}>Clear</button>
          </>
        )}
      </div>

      {/* Auto-advance toggle */}
      <button
        className={`btn btn-sm ${autoAdvance ? 'active' : ''}`}
        onClick={toggleAutoAdvance}
        title="Auto-advance after flagging"
      >
        ⏩ Auto
      </button>

      {/* AI Analysis */}
      <button
        className="btn btn-primary"
        onClick={() => startAnalysis()}
        disabled={isAnalyzing}
      >
        {isAnalyzing ? '⏳ Analyzing...' : '🤖 AI Analyze'}
      </button>

      {/* Sidebar toggle */}
      <button
        className={`btn btn-icon ${sidebarVisible ? 'active' : ''}`}
        onClick={toggleSidebar}
        title="Toggle Sidebar"
      >
        ◧
      </button>
    </div>
  )
}
