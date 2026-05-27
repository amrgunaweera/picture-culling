import { useSessionStore, usePhotoStore, useAnalysisStore } from '../store'

export function StatusBar() {
  const { currentSession } = useSessionStore()
  const { photos } = usePhotoStore()
  const { isAnalyzing, progress } = useAnalysisStore()

  const picks = photos.filter(p => p.flag === 'pick').length
  const rejects = photos.filter(p => p.flag === 'reject').length
  const unflagged = photos.filter(p => p.flag === 'none').length
  const analyzed = photos.filter(p => p.compositeScore !== null).length

  return (
    <div className="statusbar">
      <div className="statusbar-item">
        📷 {photos.length} photos
      </div>

      {analyzed > 0 && (
        <div className="statusbar-item">
          🤖 {analyzed} analyzed
        </div>
      )}

      <div className="statusbar-item" style={{ color: 'var(--color-pick)' }}>
        ✓ {picks}
      </div>
      <div className="statusbar-item" style={{ color: 'var(--color-reject)' }}>
        ✕ {rejects}
      </div>
      <div className="statusbar-item">
        ○ {unflagged}
      </div>

      <div className="statusbar-spacer" />

      {isAnalyzing && progress && (
        <div className="statusbar-item">
          <div className="progress-bar" style={{ width: '120px' }}>
            <div
              className="progress-bar-fill"
              style={{ width: `${progress.percentage}%` }}
            />
          </div>
          <span>{progress.percentage}%</span>
        </div>
      )}

      {currentSession && (
        <div className="statusbar-item">
          📁 {currentSession.folderPath}
        </div>
      )}
    </div>
  )
}
