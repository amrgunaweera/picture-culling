import initSqlJs, { Database as SqlJsDatabase } from 'sql.js'
import path from 'path'
import fs from 'fs'
import { app } from 'electron'
import type { Photo, PhotoDetail, PhotoFilters, Session, Flag, ColorLabel, BulkAction } from '../types'

let db: SqlJsDatabase
let dbPath: string

const SCHEMA = `
CREATE TABLE IF NOT EXISTS sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  folder_path TEXT NOT NULL,
  name TEXT,
  photo_count INTEGER DEFAULT 0,
  analyzed_count INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  file_hash TEXT,
  modified_at TEXT,
  thumbnail_path TEXT,
  width INTEGER DEFAULT 0,
  height INTEGER DEFAULT 0,
  camera_make TEXT,
  camera_model TEXT,
  lens TEXT,
  iso INTEGER,
  shutter_speed TEXT,
  aperture REAL,
  focal_length REAL,
  taken_at TEXT,
  blur_score REAL,
  exposure_score REAL,
  aesthetic_score REAL,
  composite_score REAL,
  face_count INTEGER,
  phash TEXT,
  rating INTEGER DEFAULT 0,
  color_label TEXT DEFAULT 'none',
  flag TEXT DEFAULT 'none',
  duplicate_group_id INTEGER,
  session_id INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  UNIQUE(file_path, session_id),
  FOREIGN KEY (session_id) REFERENCES sessions(id)
);

CREATE INDEX IF NOT EXISTS idx_photos_session ON photos(session_id);
CREATE INDEX IF NOT EXISTS idx_photos_flag ON photos(flag);
CREATE INDEX IF NOT EXISTS idx_photos_rating ON photos(rating);
CREATE INDEX IF NOT EXISTS idx_photos_composite ON photos(composite_score);
CREATE INDEX IF NOT EXISTS idx_photos_phash ON photos(phash);
CREATE INDEX IF NOT EXISTS idx_photos_duplicate_group ON photos(duplicate_group_id);
`

function saveDb(): void {
  if (db && dbPath) {
    try {
      const data = db.export()
      const buffer = Buffer.from(data)
      fs.writeFileSync(dbPath, buffer)
    } catch (error) {
      console.error('Failed to save database:', error)
    }
  }
}

export async function initDatabase(): Promise<void> {
  const locateFile = app.isPackaged
    ? () => path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    : undefined

  const SQL = await initSqlJs({ locateFile })
  dbPath = path.join(app.getPath('userData'), 'cullexa-picture-organizer.db')

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath)
    db = new SQL.Database(fileBuffer)
  } else {
    db = new SQL.Database()
  }

  db.run(SCHEMA)
  saveDb()
}

export function getDb(): SqlJsDatabase {
  return db
}

// --- Session operations ---

export function createSession(folderPath: string, name: string): Session {
  db.run('INSERT INTO sessions (folder_path, name) VALUES (?, ?)', [folderPath, name])

  const result = db.exec('SELECT last_insert_rowid() as id')
  const id = result[0].values[0][0] as number

  saveDb()
  return {
    id,
    folderPath,
    name,
    photoCount: 0,
    analyzedCount: 0,
    createdAt: new Date().toISOString()
  }
}

export function getSessions(): Session[] {
  const result = db.exec('SELECT * FROM sessions ORDER BY created_at DESC')
  if (result.length === 0) return []
  return result[0].values.map(row => mapSessionRow(result[0].columns, row))
}

export function updateSessionCounts(sessionId: number): void {
  const r1 = db.exec('SELECT COUNT(*) FROM photos WHERE session_id = ?', [sessionId])
  const photoCount = r1.length > 0 ? r1[0].values[0][0] as number : 0

  const r2 = db.exec('SELECT COUNT(*) FROM photos WHERE session_id = ? AND blur_score IS NOT NULL', [sessionId])
  const analyzedCount = r2.length > 0 ? r2[0].values[0][0] as number : 0

  db.run('UPDATE sessions SET photo_count = ?, analyzed_count = ? WHERE id = ?', [photoCount, analyzedCount, sessionId])
  saveDb()
}

export function deleteSession(sessionId: number): void {
  db.run('DELETE FROM photos WHERE session_id = ?', [sessionId])
  db.run('DELETE FROM sessions WHERE id = ?', [sessionId])
  saveDb()
}

export function clearSessionPhotos(sessionId: number): void {
  db.run('DELETE FROM photos WHERE session_id = ?', [sessionId])
  saveDb()
}

// --- Photo operations ---

export function insertPhoto(photo: {
  filePath: string
  fileName: string
  fileSize: number
  modifiedAt: string
  width: number
  height: number
  thumbnailPath: string | null
  sessionId: number
  cameraMake?: string | null
  cameraModel?: string | null
  lens?: string | null
  iso?: number | null
  shutterSpeed?: string | null
  aperture?: number | null
  focalLength?: number | null
  takenAt?: string | null
}): number {
  db.run(`
    INSERT OR REPLACE INTO photos (
      file_path, file_name, file_size, modified_at, width, height, thumbnail_path, session_id,
      camera_make, camera_model, lens, iso, shutter_speed, aperture, focal_length, taken_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    photo.filePath, photo.fileName, photo.fileSize, photo.modifiedAt,
    photo.width, photo.height, photo.thumbnailPath, photo.sessionId,
    photo.cameraMake ?? null, photo.cameraModel ?? null, photo.lens ?? null,
    photo.iso ?? null, photo.shutterSpeed ?? null, photo.aperture ?? null,
    photo.focalLength ?? null, photo.takenAt ?? null
  ])

  const result = db.exec('SELECT last_insert_rowid()')
  saveDb()
  return result[0].values[0][0] as number
}

export function updatePhotoScores(id: number, scores: {
  blurScore?: number | null
  exposureScore?: number | null
  aestheticScore?: number | null
  compositeScore?: number | null
  faceCount?: number | null
  phash?: string | null
}): void {
  const sets: string[] = []
  const values: any[] = []

  if (scores.blurScore !== undefined) { sets.push('blur_score = ?'); values.push(scores.blurScore) }
  if (scores.exposureScore !== undefined) { sets.push('exposure_score = ?'); values.push(scores.exposureScore) }
  if (scores.aestheticScore !== undefined) { sets.push('aesthetic_score = ?'); values.push(scores.aestheticScore) }
  if (scores.compositeScore !== undefined) { sets.push('composite_score = ?'); values.push(scores.compositeScore) }
  if (scores.faceCount !== undefined) { sets.push('face_count = ?'); values.push(scores.faceCount) }
  if (scores.phash !== undefined) { sets.push('phash = ?'); values.push(scores.phash) }

  if (sets.length === 0) return

  values.push(id)
  db.run(`UPDATE photos SET ${sets.join(', ')} WHERE id = ?`, values)
  saveDb()
}

export function updatePhotoThumbnail(id: number, thumbnailPath: string, width: number, height: number): void {
  db.run('UPDATE photos SET thumbnail_path = ?, width = ?, height = ? WHERE id = ?', [thumbnailPath, width, height, id])
  saveDb()
}

export function setPhotoRating(id: number, rating: number): void {
  db.run('UPDATE photos SET rating = ? WHERE id = ?', [rating, id])
  saveDb()
}

export function setPhotoFlag(id: number, flag: Flag): void {
  db.run('UPDATE photos SET flag = ? WHERE id = ?', [flag, id])
  saveDb()
}

export function setPhotoColorLabel(id: number, color: ColorLabel): void {
  db.run('UPDATE photos SET color_label = ? WHERE id = ?', [color, id])
  saveDb()
}

export function bulkUpdatePhotos(ids: number[], action: BulkAction): void {
  for (const id of ids) {
    switch (action.type) {
      case 'setRating':
        setPhotoRating(id, action.value as number)
        break
      case 'setFlag':
        setPhotoFlag(id, action.value as Flag)
        break
      case 'setColorLabel':
        setPhotoColorLabel(id, action.value as ColorLabel)
        break
    }
  }
  saveDb()
}

export function getPhotos(sessionId: number, filters: PhotoFilters): Photo[] {
  let query = 'SELECT * FROM photos WHERE session_id = ?'
  const params: any[] = [sessionId]

  if (filters.minRating !== undefined) {
    query += ' AND rating >= ?'
    params.push(filters.minRating)
  }
  if (filters.maxRating !== undefined) {
    query += ' AND rating <= ?'
    params.push(filters.maxRating)
  }
  if (filters.flags && filters.flags.length > 0) {
    query += ` AND flag IN (${filters.flags.map(() => '?').join(',')})`
    params.push(...filters.flags)
  }
  if (filters.colorLabels && filters.colorLabels.length > 0) {
    query += ` AND color_label IN (${filters.colorLabels.map(() => '?').join(',')})`
    params.push(...filters.colorLabels)
  }
  if (filters.minCompositeScore !== undefined) {
    query += ' AND composite_score >= ?'
    params.push(filters.minCompositeScore)
  }
  if (filters.maxCompositeScore !== undefined) {
    query += ' AND composite_score <= ?'
    params.push(filters.maxCompositeScore)
  }
  if (filters.duplicatesOnly) {
    query += ' AND duplicate_group_id IS NOT NULL'
  }
  if (filters.searchQuery) {
    query += ' AND file_name LIKE ?'
    params.push(`%${filters.searchQuery}%`)
  }

  // Sorting
  const sortField = filters.sortBy || 'takenAt'
  const sortDir = filters.sortDirection || 'desc'
  const fieldMap: Record<string, string> = {
    compositeScore: 'composite_score',
    takenAt: 'taken_at',
    fileName: 'file_name',
    rating: 'rating',
    blurScore: 'blur_score',
    fileSize: 'file_size'
  }
  const dbField = fieldMap[sortField] || 'taken_at'
  query += ` ORDER BY ${dbField} ${sortDir === 'asc' ? 'ASC' : 'DESC'}`

  const result = db.exec(query, params)
  if (result.length === 0) return []
  return result[0].values.map(row => mapPhotoRow(result[0].columns, row))
}

export function getPhotoById(id: number): PhotoDetail | null {
  const result = db.exec('SELECT * FROM photos WHERE id = ?', [id])
  if (result.length === 0 || result[0].values.length === 0) return null
  const photo = mapPhotoRow(result[0].columns, result[0].values[0])
  return { ...photo, fullPath: photo.filePath, histogram: null }
}

export function getUnanalyzedPhotos(sessionId: number): { id: number; filePath: string }[] {
  const result = db.exec(
    'SELECT id, file_path FROM photos WHERE session_id = ? AND blur_score IS NULL',
    [sessionId]
  )
  if (result.length === 0) return []
  return result[0].values.map(row => ({ id: row[0] as number, filePath: row[1] as string }))
}

export function getAllPhotoHashes(sessionId: number): { id: number; phash: string }[] {
  const result = db.exec(
    'SELECT id, phash FROM photos WHERE session_id = ? AND phash IS NOT NULL',
    [sessionId]
  )
  if (result.length === 0) return []
  return result[0].values.map(row => ({ id: row[0] as number, phash: row[1] as string }))
}

export function setDuplicateGroup(photoIds: number[], groupId: number): void {
  for (const id of photoIds) {
    db.run('UPDATE photos SET duplicate_group_id = ? WHERE id = ?', [groupId, id])
  }
  saveDb()
}

export function getPhotosByFlag(sessionId: number, flag: Flag): Photo[] {
  const result = db.exec('SELECT * FROM photos WHERE session_id = ? AND flag = ?', [sessionId, flag])
  if (result.length === 0) return []
  return result[0].values.map(row => mapPhotoRow(result[0].columns, row))
}

// --- Mappers ---

export function deletePhotos(ids: number[]) {
  if (ids.length === 0) return
  const placeholders = ids.map(() => '?').join(',')
  db.run(`DELETE FROM photos WHERE id IN (${placeholders})`, ids)
  saveDb()
}

function mapPhotoRow(columns: string[], row: any[]): Photo {
  const obj: any = {}
  columns.forEach((col, idx) => { obj[col] = row[idx] })

  return {
    id: obj.id,
    filePath: obj.file_path,
    fileName: obj.file_name,
    fileSize: obj.file_size,
    fileHash: obj.file_hash,
    modifiedAt: obj.modified_at,
    thumbnailPath: obj.thumbnail_path,
    width: obj.width,
    height: obj.height,
    cameraMake: obj.camera_make,
    cameraModel: obj.camera_model,
    lens: obj.lens,
    iso: obj.iso,
    shutterSpeed: obj.shutter_speed,
    aperture: obj.aperture,
    focalLength: obj.focal_length,
    takenAt: obj.taken_at,
    blurScore: obj.blur_score,
    exposureScore: obj.exposure_score,
    aestheticScore: obj.aesthetic_score,
    compositeScore: obj.composite_score,
    faceCount: obj.face_count,
    phash: obj.phash,
    rating: obj.rating,
    colorLabel: (obj.color_label || 'none') as ColorLabel,
    flag: (obj.flag || 'none') as Flag,
    duplicateGroupId: obj.duplicate_group_id,
    sessionId: obj.session_id
  }
}

function mapSessionRow(columns: string[], row: any[]): Session {
  const obj: any = {}
  columns.forEach((col, idx) => { obj[col] = row[idx] })

  return {
    id: obj.id,
    folderPath: obj.folder_path,
    name: obj.name,
    photoCount: obj.photo_count,
    analyzedCount: obj.analyzed_count,
    createdAt: obj.created_at
  }
}
