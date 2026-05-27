import { useState, useEffect } from 'react'
import { useSessionStore } from '../store'

export function ImportView() {
  const { sessions, openFolder, setCurrentSession, deleteSession, loadSessions } = useSessionStore()
  const [dragOver, setDragOver] = useState(false)

  useEffect(() => {
    loadSessions()
  }, [])

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    // Electron doesn't support folder drops the same way, so we use the dialog
    openFolder()
  }

  return (
    <div className="import-view animate-fade-in">
      <div className="import-hero">
        <div className="import-hero-icon">📷</div>
        <h1>Welcome to PictureCull</h1>
        <p>
          AI-powered photo culling that analyzes sharpness, exposure, duplicates, and more —
          helping you find your best shots in seconds.
        </p>
      </div>

      <div
        className={`dropzone ${dragOver ? 'dragover' : ''}`}
        onClick={() => openFolder()}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="dropzone-icon">📁</div>
        <div className="dropzone-text">Click to select a folder of photos</div>
        <div className="dropzone-hint">Supports JPEG, PNG, TIFF, WebP, and RAW formats</div>
      </div>

      {sessions.length > 0 && (
        <div className="recent-sessions animate-slide-up">
          <div className="recent-sessions-title">Recent Sessions</div>
          {sessions.map((session) => (
            <div
              key={session.id}
              className="session-card"
              onClick={() => setCurrentSession(session)}
            >
              <div className="session-card-icon">📂</div>
              <div className="session-card-info">
                <div className="session-card-name">{session.name}</div>
                <div className="session-card-meta">{session.folderPath}</div>
              </div>
              <div className="session-card-count">{session.photoCount}</div>
              <button
                className="btn btn-icon btn-ghost session-card-delete"
                onClick={(e) => {
                  e.stopPropagation()
                  deleteSession(session.id)
                }}
                title="Delete session"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
