import { useSessionStore, usePhotoStore, useAnalysisStore } from '../store'
import { IconCamera, IconSparkles, IconCheck, IconX, IconCircle, IconFolder } from '@tabler/icons-react'

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
        <IconCamera size={14} /> {photos.length} photos
      </div>

      {analyzed > 0 && (
        <div className="statusbar-item">
          <IconSparkles size={14} /> {analyzed} analyzed
        </div>
      )}

      <div className="statusbar-item" style={{ color: 'var(--color-pick)' }}>
        <IconCheck size={14} style={{ color: 'var(--color-pick)' }} /> {picks}
      </div>
      <div className="statusbar-item" style={{ color: 'var(--color-reject)' }}>
        <IconX size={14} style={{ color: 'var(--color-reject)' }} /> {rejects}
      </div>
      <div className="statusbar-item">
        <IconCircle size={14} /> {unflagged}
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
          <IconFolder size={14} /> {currentSession.folderPath}
        </div>
      )}
    </div>
  )
}
