import { useEffect } from 'react'
import { useSessionStore, usePhotoStore, useAnalysisStore, useUIStore } from './store'
import { ImportView } from './components/ImportView'
import { Toolbar } from './components/Toolbar'
import { PhotoGrid } from './components/PhotoGrid'
import { PhotoViewer } from './components/PhotoViewer'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { FilterBar } from './components/FilterBar'
import { ProgressOverlay } from './components/ProgressOverlay'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'

export function App() {
  const { currentSession, isScanning, loadSessions } = useSessionStore()
  const { loadPhotos } = usePhotoStore()
  const { setProgress, isAnalyzing } = useAnalysisStore()
  const { viewMode, sidebarVisible } = useUIStore()

  // Load sessions on mount
  useEffect(() => {
    loadSessions()
  }, [])

  // Load photos when session changes
  useEffect(() => {
    if (currentSession) {
      loadPhotos()
    }
  }, [currentSession?.id])

  // Listen for analysis progress
  useEffect(() => {
    const unsub = window.api.onAnalysisProgress((progress) => {
      setProgress(progress)
      if (progress.stage === 'complete') {
        loadPhotos()
      }
    })
    return unsub
  }, [])

  // Listen for scan progress
  useEffect(() => {
    const unsub = window.api.onScanProgress((progress) => {
      useSessionStore.getState().setScanProgress(progress)
    })
    return unsub
  }, [])

  // Register keyboard shortcuts
  useKeyboardShortcuts()

  // Show import view if no session selected
  if (!currentSession) {
    return (
      <div className="app-layout">
        <div className="app-titlebar">
          <div className="logo-icon" />
          <span className="app-titlebar-title">PictureCull</span>
        </div>
        <ImportView />
        {isScanning && <ProgressOverlay type="scan" />}
      </div>
    )
  }

  return (
    <div className="app-layout">
      <div className="app-titlebar">
        <div className="logo-icon" />
        <span className="app-titlebar-title">PictureCull</span>
      </div>
      <Toolbar />
      <FilterBar />
      <div className="app-body">
        <div className="app-main">
          {viewMode === 'grid' ? <PhotoGrid /> : <PhotoViewer />}
        </div>
        {sidebarVisible && <Sidebar />}
      </div>
      <StatusBar />
      {isAnalyzing && <ProgressOverlay type="analysis" />}
      {isScanning && <ProgressOverlay type="scan" />}
    </div>
  )
}
