export interface Photo {
    id: number;
    filePath: string;
    fileName: string;
    fileSize: number;
    fileHash: string | null;
    modifiedAt: string;
    thumbnailPath: string | null;
    width: number;
    height: number;
    cameraMake: string | null;
    cameraModel: string | null;
    lens: string | null;
    iso: number | null;
    shutterSpeed: string | null;
    aperture: number | null;
    focalLength: number | null;
    takenAt: string | null;
    blurScore: number | null;
    exposureScore: number | null;
    aestheticScore: number | null;
    compositeScore: number | null;
    faceCount: number | null;
    phash: string | null;
    rating: number;
    colorLabel: ColorLabel;
    flag: Flag;
    duplicateGroupId: number | null;
    sessionId: number;
}
export interface PhotoDetail extends Photo {
    fullPath: string;
    histogram: number[] | null;
}
export interface Session {
    id: number;
    folderPath: string;
    name: string;
    photoCount: number;
    analyzedCount: number;
    createdAt: string;
}
export type Flag = 'pick' | 'reject' | 'none';
export type ColorLabel = 'none' | 'red' | 'yellow' | 'green' | 'blue' | 'purple';
export type ViewMode = 'grid' | 'loupe' | 'compare' | 'duplicates';
export type SortField = 'compositeScore' | 'takenAt' | 'fileName' | 'rating' | 'blurScore' | 'fileSize';
export type SortDirection = 'asc' | 'desc';
export interface PhotoFilters {
    minRating?: number;
    maxRating?: number;
    flags?: Flag[];
    colorLabels?: ColorLabel[];
    minCompositeScore?: number;
    maxCompositeScore?: number;
    duplicatesOnly?: boolean;
    sortBy?: SortField;
    sortDirection?: SortDirection;
    searchQuery?: string;
}
export interface AnalysisProgress {
    sessionId: number;
    total: number;
    completed: number;
    currentFile: string;
    stage: 'scanning' | 'thumbnails' | 'blur' | 'exposure' | 'duplicates' | 'faces' | 'aesthetic' | 'complete';
    percentage: number;
}
export interface ScanProgress {
    total: number;
    scanned: number;
    currentFile: string;
    percentage: number;
}
export interface BulkAction {
    type: 'setRating' | 'setFlag' | 'setColorLabel' | 'delete';
    value?: number | string;
}
export interface DuplicateGroup {
    groupId: number;
    photos: Photo[];
    bestPhotoId: number | null;
}
export interface ElectronAPI {
    openFolderDialog(): Promise<string | null>;
    scanFolder(folderPath: string): Promise<Session>;
    getPhotos(sessionId: number, filters: PhotoFilters): Promise<Photo[]>;
    getPhotoDetail(id: number): Promise<PhotoDetail | null>;
    getPhotoFullPath(id: number): Promise<string | null>;
    getSessions(): Promise<Session[]>;
    deleteSession(id: number): Promise<void>;
    setRating(id: number, rating: number): Promise<void>;
    setFlag(id: number, flag: Flag): Promise<void>;
    setColorLabel(id: number, color: ColorLabel): Promise<void>;
    bulkAction(ids: number[], action: BulkAction): Promise<void>;
    startAnalysis(sessionId: number): Promise<void>;
    stopAnalysis(): Promise<void>;
    moveRejected(sessionId: number, targetDir: string): Promise<number>;
    exportPicked(sessionId: number, targetDir: string): Promise<number>;
    deleteRejected(sessionId: number): Promise<number>;
    onAnalysisProgress(callback: (progress: AnalysisProgress) => void): () => void;
    onScanProgress(callback: (progress: ScanProgress) => void): () => void;
}
declare global {
    interface Window {
        api: ElectronAPI;
    }
}
