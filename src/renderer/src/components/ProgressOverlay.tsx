import { useSessionStore, useAnalysisStore } from '../store'

interface ProgressOverlayProps {
  type: 'scan' | 'analysis'
}

export function ProgressOverlay({ type }: ProgressOverlayProps) {
  const { scanProgress } = useSessionStore()
  const { progress: analysisProgress, stopAnalysis } = useAnalysisStore()

  const isScan = type === 'scan'
  const progress = isScan ? scanProgress : analysisProgress
  const percentage = progress?.percentage ?? 0

  return (
    <div className="progress-overlay animate-fade-in">
      <div className="progress-card animate-scale-in">
        <div style={{ fontSize: '48px', marginBottom: 'var(--space-4)' }}>
          {isScan ? '📁' : '🤖'}
        </div>

        <h3>{isScan ? 'Scanning Photos' : 'AI Analysis'}</h3>

        <div className="progress-percentage">
          {percentage}%
        </div>

        <div className="progress-bar" style={{ marginBottom: 'var(--space-3)' }}>
          <div
            className="progress-bar-fill"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {isScan && scanProgress && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {scanProgress.scanned} files processed
          </div>
        )}

        {!isScan && analysisProgress && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            {analysisProgress.completed} / {analysisProgress.total} photos
          </div>
        )}

        <div className="progress-file">
          {(progress as any)?.currentFile || 'Preparing...'}
        </div>

        {!isScan && (
          <button
            className="btn"
            style={{ marginTop: 'var(--space-4)' }}
            onClick={stopAnalysis}
          >
            Stop Analysis
          </button>
        )}
      </div>
    </div>
  )
}
