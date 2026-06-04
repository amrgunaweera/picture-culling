import { useEffect } from 'react'
import { useSessionStore, usePhotoStore, useAnalysisStore, useUIStore } from './store'
import { ImportView } from './components/ImportView'
import { Toolbar } from './components/Toolbar'
import { PhotoGrid } from './components/PhotoGrid'
import { PhotoViewer } from './components/PhotoViewer'
import { CompareView } from './components/CompareView'
import { DuplicateView } from './components/DuplicateView'
import { Sidebar } from './components/Sidebar'
import { StatusBar } from './components/StatusBar'
import { FilterBar } from './components/FilterBar'
import { ProgressOverlay } from './components/ProgressOverlay'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import logoUrl from './assets/logo.png'

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
          <img src={logoUrl} className="logo-icon" alt="Cullexa" />
          <span className="app-titlebar-title">Cullexa Picture Organizer</span>
        </div>
        <ImportView />
        {isScanning && <ProgressOverlay type="scan" />}
      </div>
    )
  }

  return (
    <div className="app-layout">
      <div className="app-titlebar">
        <img src={logoUrl} className="logo-icon" alt="Cullexa" />
        <span className="app-titlebar-title">Cullexa Picture Organizer</span>
      </div>
      <Toolbar />
      <FilterBar />
      <div className="app-body">
        <div className="app-main">
          {viewMode === 'grid' && <PhotoGrid />}
          {viewMode === 'loupe' && <PhotoViewer />}
          {viewMode === 'compare' && <CompareView />}
          {viewMode === 'duplicates' && <DuplicateView />}
        </div>
        {sidebarVisible && <Sidebar />}
      </div>
      <StatusBar />
      {isAnalyzing && <ProgressOverlay type="analysis" />}
      {isScanning && <ProgressOverlay type="scan" />}
    </div>
  )
}
