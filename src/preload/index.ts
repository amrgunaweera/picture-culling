import { contextBridge, ipcRenderer } from 'electron'
import type { ElectronAPI } from '../../types'

const api: ElectronAPI = {
  // File operations
  openFolderDialog: () => ipcRenderer.invoke('open-folder-dialog'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  getPhotos: (sessionId, filters) => ipcRenderer.invoke('get-photos', sessionId, filters),
  getPhotoDetail: (id) => ipcRenderer.invoke('get-photo-detail', id),
  getPhotoFullPath: (id) => ipcRenderer.invoke('get-photo-full-path', id),
  getSessions: () => ipcRenderer.invoke('get-sessions'),
  deleteSession: (id) => ipcRenderer.invoke('delete-session', id),

  // Culling actions
  setRating: (id, rating) => ipcRenderer.invoke('set-rating', id, rating),
  setFlag: (id, flag) => ipcRenderer.invoke('set-flag', id, flag),
  setColorLabel: (id, color) => ipcRenderer.invoke('set-color-label', id, color),
  bulkAction: (ids, action) => ipcRenderer.invoke('bulk-action', ids, action),

  // AI analysis
  startAnalysis: (sessionId) => ipcRenderer.invoke('start-analysis', sessionId),
  stopAnalysis: () => ipcRenderer.invoke('stop-analysis'),

  // Export operations
  moveRejected: (sessionId, targetDir) => ipcRenderer.invoke('move-rejected', sessionId, targetDir),
  exportPicked: (sessionId, targetDir) => ipcRenderer.invoke('export-picked', sessionId, targetDir),
  deleteRejected: (sessionId) => ipcRenderer.invoke('delete-rejected', sessionId),

  // Events
  onAnalysisProgress: (callback) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('analysis-progress', listener)
    return () => ipcRenderer.removeListener('analysis-progress', listener)
  },
  onScanProgress: (callback) => {
    const listener = (_event: any, progress: any) => callback(progress)
    ipcRenderer.on('scan-progress', listener)
    return () => ipcRenderer.removeListener('scan-progress', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)
