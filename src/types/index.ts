// Shared types used across main, preload, and renderer processes

export interface Photo {
  id: number
  filePath: string
  fileName: string
  fileSize: number
  fileHash: string | null
  modifiedAt: string
  thumbnailPath: string | null
  width: number
  height: number
  // EXIF
  cameraMake: string | null
  cameraModel: string | null
  lens: string | null
  iso: number | null
  shutterSpeed: string | null
  aperture: number | null
  focalLength: number | null
  takenAt: string | null
  // AI Scores (0.0 - 1.0)
  blurScore: number | null
  exposureScore: number | null
  aestheticScore: number | null
  compositeScore: number | null
  faceCount: number | null
  // Perceptual hash
  phash: string | null
  // User culling data
  rating: number
  colorLabel: ColorLabel
  flag: Flag
  // Group
  duplicateGroupId: number | null
  sessionId: number
}

export interface PhotoDetail extends Photo {
  fullPath: string
  histogram: number[] | null
}

export interface Session {
  id: number
  folderPath: string
  name: string
  photoCount: number
  analyzedCount: number
  createdAt: string
}

export type Flag = 'pick' | 'reject' | 'none'
export type ColorLabel = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple'
export type ViewMode = 'grid' | 'loupe' | 'compare' | 'duplicates'
export type SortField = 'compositeScore' | 'takenAt' | 'fileName' | 'rating' | 'blurScore' | 'fileSize'
export type SortDirection = 'asc' | 'desc'

export interface PhotoFilters {
  minRating?: number
  maxRating?: number
  flags?: Flag[]
  colorLabels?: ColorLabel[]
  minCompositeScore?: number
  maxCompositeScore?: number
  duplicatesOnly?: boolean
  sortBy?: SortField
  sortDirection?: SortDirection
  searchQuery?: string
}

export interface AnalysisProgress {
  sessionId: number
  total: number
  completed: number
  currentFile: string
  stage: 'scanning' | 'thumbnails' | 'blur' | 'exposure' | 'duplicates' | 'faces' | 'aesthetic' | 'complete'
  percentage: number
}

export interface ScanProgress {
  total: number
  scanned: number
  currentFile: string
  percentage: number
}

export interface BulkAction {
  type: 'setRating' | 'setFlag' | 'setColorLabel' | 'delete'
  value?: number | string
}

export interface DuplicateGroup {
  groupId: number
  photos: Photo[]
  bestPhotoId: number | null
}

// IPC API interface exposed via contextBridge
export interface ElectronAPI {
  // File operations
  openFolderDialog(): Promise<string | null>
  scanFolder(folderPath: string): Promise<Session>
  getPhotos(sessionId: number, filters: PhotoFilters): Promise<Photo[]>
  getPhotoDetail(id: number): Promise<PhotoDetail | null>
  getPhotoFullPath(id: number): Promise<string | null>
  getSessions(): Promise<Session[]>
  deleteSession(id: number): Promise<void>

  // Culling actions
  setRating(id: number, rating: number): Promise<void>
  setFlag(id: number, flag: Flag): Promise<void>
  setColorLabel(id: number, color: ColorLabel): Promise<void>
  bulkAction(ids: number[], action: BulkAction): Promise<void>

  // AI analysis
  startAnalysis(sessionId: number): Promise<void>
  stopAnalysis(): Promise<void>

  // File export operations
  moveRejected(sessionId: number, targetDir: string): Promise<number>
  exportPicked(sessionId: number, targetDir: string): Promise<number>

  // Events
  onAnalysisProgress(callback: (progress: AnalysisProgress) => void): () => void
  onScanProgress(callback: (progress: ScanProgress) => void): () => void
}

declare global {
  interface Window {
    api: ElectronAPI
  }
}
