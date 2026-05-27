import { create } from 'zustand'
import type { Session, Photo, PhotoFilters, AnalysisProgress, Flag, ColorLabel, ViewMode, SortField, SortDirection } from '../../../../types'

// --- Session Store ---
interface SessionState {
  sessions: Session[]
  currentSession: Session | null
  isScanning: boolean
  scanProgress: { total: number; scanned: number; currentFile: string; percentage: number } | null
  loadSessions: () => Promise<void>
  setCurrentSession: (session: Session | null) => void
  openFolder: () => Promise<void>
  deleteSession: (id: number) => Promise<void>
  setScanProgress: (progress: any) => void
  setIsScanning: (scanning: boolean) => void
}

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  isScanning: false,
  scanProgress: null,

  loadSessions: async () => {
    const sessions = await window.api.getSessions()
    set({ sessions })
  },

  setCurrentSession: (session) => set({ currentSession: session }),

  openFolder: async () => {
    const folderPath = await window.api.openFolderDialog()
    if (!folderPath) return

    set({ isScanning: true, scanProgress: { total: 0, scanned: 0, currentFile: '', percentage: 0 } })

    const session = await window.api.scanFolder(folderPath)

    set({ isScanning: false, scanProgress: null, currentSession: session })
    await get().loadSessions()
  },

  deleteSession: async (id) => {
    await window.api.deleteSession(id)
    const state = get()
    if (state.currentSession?.id === id) {
      set({ currentSession: null })
    }
    await state.loadSessions()
  },

  setScanProgress: (progress) => set({ scanProgress: progress }),
  setIsScanning: (scanning) => set({ isScanning: scanning })
}))

// --- Photo Store ---
interface PhotoState {
  photos: Photo[]
  selectedIds: Set<number>
  currentIndex: number
  isLoading: boolean
  loadPhotos: () => Promise<void>
  selectPhoto: (id: number, multi?: boolean) => void
  selectAll: () => void
  clearSelection: () => void
  setCurrentIndex: (index: number) => void
  setRating: (id: number, rating: number) => Promise<void>
  setFlag: (id: number, flag: Flag) => Promise<void>
  setColorLabel: (id: number, color: ColorLabel) => Promise<void>
  updatePhotoInList: (id: number, updates: Partial<Photo>) => void
}

export const usePhotoStore = create<PhotoState>((set, get) => ({
  photos: [],
  selectedIds: new Set(),
  currentIndex: 0,
  isLoading: false,

  loadPhotos: async () => {
    const session = useSessionStore.getState().currentSession
    if (!session) return

    set({ isLoading: true })
    const filters = useFilterStore.getState().filters
    const photos = await window.api.getPhotos(session.id, filters)
    set({ photos, isLoading: false })
  },

  selectPhoto: (id, multi = false) => {
    set(state => {
      const newSelected = multi ? new Set(state.selectedIds) : new Set<number>()
      if (newSelected.has(id)) {
        newSelected.delete(id)
      } else {
        newSelected.add(id)
      }
      const index = state.photos.findIndex(p => p.id === id)
      return { selectedIds: newSelected, currentIndex: index >= 0 ? index : state.currentIndex }
    })
  },

  selectAll: () => {
    set(state => ({
      selectedIds: new Set(state.photos.map(p => p.id))
    }))
  },

  clearSelection: () => set({ selectedIds: new Set() }),

  setCurrentIndex: (index) => set({ currentIndex: index }),

  setRating: async (id, rating) => {
    await window.api.setRating(id, rating)
    get().updatePhotoInList(id, { rating })
  },

  setFlag: async (id, flag) => {
    await window.api.setFlag(id, flag)
    get().updatePhotoInList(id, { flag })
  },

  setColorLabel: async (id, color) => {
    await window.api.setColorLabel(id, color)
    get().updatePhotoInList(id, { colorLabel: color })
  },

  updatePhotoInList: (id, updates) => {
    set(state => ({
      photos: state.photos.map(p => p.id === id ? { ...p, ...updates } : p)
    }))
  }
}))

// --- Filter Store ---
interface FilterState {
  filters: PhotoFilters
  setFilter: <K extends keyof PhotoFilters>(key: K, value: PhotoFilters[K]) => void
  clearFilters: () => void
  toggleFlag: (flag: Flag) => void
  toggleColorLabel: (label: ColorLabel) => void
}

const defaultFilters: PhotoFilters = {
  sortBy: 'compositeScore' as SortField,
  sortDirection: 'desc' as SortDirection
}

export const useFilterStore = create<FilterState>((set, get) => ({
  filters: { ...defaultFilters },

  setFilter: (key, value) => {
    set(state => ({
      filters: { ...state.filters, [key]: value }
    }))
  },

  clearFilters: () => set({ filters: { ...defaultFilters } }),

  toggleFlag: (flag) => {
    set(state => {
      const current = state.filters.flags || []
      const updated = current.includes(flag)
        ? current.filter(f => f !== flag)
        : [...current, flag]
      return { filters: { ...state.filters, flags: updated.length > 0 ? updated : undefined } }
    })
  },

  toggleColorLabel: (label) => {
    set(state => {
      const current = state.filters.colorLabels || []
      const updated = current.includes(label)
        ? current.filter(l => l !== label)
        : [...current, label]
      return { filters: { ...state.filters, colorLabels: updated.length > 0 ? updated : undefined } }
    })
  }
}))

// --- Analysis Store ---
interface AnalysisState {
  isAnalyzing: boolean
  progress: AnalysisProgress | null
  startAnalysis: () => Promise<void>
  stopAnalysis: () => Promise<void>
  setProgress: (progress: AnalysisProgress | null) => void
}

export const useAnalysisStore = create<AnalysisState>((set) => ({
  isAnalyzing: false,
  progress: null,

  startAnalysis: async () => {
    const session = useSessionStore.getState().currentSession
    if (!session) return

    set({ isAnalyzing: true })
    await window.api.startAnalysis(session.id)
    set({ isAnalyzing: false, progress: null })

    // Reload photos with new scores
    await usePhotoStore.getState().loadPhotos()
  },

  stopAnalysis: async () => {
    await window.api.stopAnalysis()
    set({ isAnalyzing: false, progress: null })
  },

  setProgress: (progress) => {
    set({ progress })
    if (progress?.stage === 'complete') {
      set({ isAnalyzing: false })
    }
  }
}))

// --- UI Store ---
interface UIState {
  viewMode: ViewMode
  sidebarVisible: boolean
  thumbnailSize: 'small' | 'medium' | 'large'
  autoAdvance: boolean
  setViewMode: (mode: ViewMode) => void
  toggleSidebar: () => void
  setThumbnailSize: (size: 'small' | 'medium' | 'large') => void
  toggleAutoAdvance: () => void
}

export const useUIStore = create<UIState>((set) => ({
  viewMode: 'grid',
  sidebarVisible: true,
  thumbnailSize: 'medium',
  autoAdvance: true,

  setViewMode: (mode) => set({ viewMode: mode }),
  toggleSidebar: () => set(state => ({ sidebarVisible: !state.sidebarVisible })),
  setThumbnailSize: (size) => set({ thumbnailSize: size }),
  toggleAutoAdvance: () => set(state => ({ autoAdvance: !state.autoAdvance }))
}))
