import fs from 'fs'
import path from 'path'
import { app } from 'electron'
import sharp from 'sharp'
import ExifReader from 'exifreader'

const SUPPORTED_EXTENSIONS = new Set([
  '.jpg', '.jpeg', '.png', '.tiff', '.tif', '.webp', '.bmp',
  '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.dng', '.raf'
])

const RAW_EXTENSIONS = new Set([
  '.cr2', '.cr3', '.nef', '.arw', '.orf', '.rw2', '.dng', '.raf'
])

const THUMBNAIL_DIR = path.join(app.getPath('userData'), 'thumbnails')

export interface ScannedFile {
  filePath: string
  fileName: string
  fileSize: number
  modifiedAt: string
  isRaw: boolean
}

export interface ThumbnailResult {
  thumbnailPath: string
  width: number
  height: number
}

export interface ExifData {
  cameraMake: string | null
  cameraModel: string | null
  lens: string | null
  iso: number | null
  shutterSpeed: string | null
  aperture: number | null
  focalLength: number | null
  takenAt: string | null
}

/**
 * Ensure thumbnail directory exists
 */
export function ensureThumbnailDir(): void {
  if (!fs.existsSync(THUMBNAIL_DIR)) {
    fs.mkdirSync(THUMBNAIL_DIR, { recursive: true })
  }
}

/**
 * Recursively scan a directory for image files
 */
export async function scanDirectory(
  dirPath: string,
  onProgress?: (current: string, count: number) => void
): Promise<ScannedFile[]> {
  const files: ScannedFile[] = []
  await scanRecursive(dirPath, files, onProgress)
  return files
}

async function scanRecursive(
  dirPath: string,
  files: ScannedFile[],
  onProgress?: (current: string, count: number) => void
): Promise<void> {
  let entries: fs.Dirent[]
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true })
  } catch {
    return // Skip directories we can't read
  }

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name)

    if (entry.isDirectory()) {
      // Skip hidden directories and system folders
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await scanRecursive(fullPath, files, onProgress)
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase()
      if (SUPPORTED_EXTENSIONS.has(ext)) {
        try {
          const stat = fs.statSync(fullPath)
          files.push({
            filePath: fullPath,
            fileName: entry.name,
            fileSize: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            isRaw: RAW_EXTENSIONS.has(ext)
          })
          onProgress?.(entry.name, files.length)
        } catch {
          // Skip files we can't stat
        }
      }
    }
  }
}

/**
 * Generate a thumbnail for an image file
 */
export async function generateThumbnail(
  filePath: string,
  sessionId: number,
  size: number = 400
): Promise<ThumbnailResult> {
  ensureThumbnailDir()

  const sessionDir = path.join(THUMBNAIL_DIR, String(sessionId))
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true })
  }

  const baseName = path.parse(filePath).name
  const thumbName = `${baseName}_${size}.jpg`
  const thumbPath = path.join(sessionDir, thumbName)

  // Check if thumbnail already exists
  if (fs.existsSync(thumbPath)) {
    const meta = await sharp(thumbPath).metadata()
    return {
      thumbnailPath: thumbPath,
      width: meta.width || 0,
      height: meta.height || 0
    }
  }

  try {
    const image = sharp(filePath, { failOn: 'none' })
    const metadata = await image.metadata()

    await image
      .resize(size, size, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85 })
      .toFile(thumbPath)

    return {
      thumbnailPath: thumbPath,
      width: metadata.width || 0,
      height: metadata.height || 0
    }
  } catch (err) {
    // For RAW files, try to extract embedded preview
    const ext = path.extname(filePath).toLowerCase()
    if (RAW_EXTENSIONS.has(ext)) {
      return extractRawPreview(filePath, thumbPath, size)
    }
    throw err
  }
}

/**
 * Extract embedded JPEG preview from RAW file
 */
async function extractRawPreview(
  rawPath: string,
  thumbPath: string,
  size: number
): Promise<ThumbnailResult> {
  try {
    // ExifReader can extract the embedded preview/thumbnail from RAW files
    const buffer = fs.readFileSync(rawPath)
    const tags = ExifReader.load(buffer, { expanded: true })

    if (tags.Thumbnail && tags.Thumbnail.image) {
      const previewBuffer = Buffer.from(tags.Thumbnail.image as ArrayBuffer)
      const metadata = await sharp(previewBuffer).metadata()

      await sharp(previewBuffer)
        .resize(size, size, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 85 })
        .toFile(thumbPath)

      return {
        thumbnailPath: thumbPath,
        width: metadata.width || 0,
        height: metadata.height || 0
      }
    }
  } catch {
    // Fallback: create a placeholder
  }

  // If all else fails, return empty
  return { thumbnailPath: '', width: 0, height: 0 }
}

/**
 * Extract EXIF metadata from an image file
 */
export async function extractExif(filePath: string): Promise<ExifData> {
  try {
    const buffer = fs.readFileSync(filePath)
    const tags = ExifReader.load(buffer, { expanded: false })

    return {
      cameraMake: getExifString(tags, 'Make'),
      cameraModel: getExifString(tags, 'Model'),
      lens: getExifString(tags, 'LensModel') || getExifString(tags, 'Lens'),
      iso: getExifNumber(tags, 'ISOSpeedRatings') || getExifNumber(tags, 'PhotographicSensitivity'),
      shutterSpeed: getExifString(tags, 'ExposureTime'),
      aperture: getExifNumber(tags, 'FNumber') || getExifNumber(tags, 'ApertureValue'),
      focalLength: getExifNumber(tags, 'FocalLength'),
      takenAt: getExifString(tags, 'DateTimeOriginal') || getExifString(tags, 'DateTime')
    }
  } catch {
    return {
      cameraMake: null,
      cameraModel: null,
      lens: null,
      iso: null,
      shutterSpeed: null,
      aperture: null,
      focalLength: null,
      takenAt: null
    }
  }
}

/**
 * Read image as raw pixel buffer for AI analysis
 */
export async function readImageForAnalysis(
  filePath: string,
  targetSize: number = 512
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const image = sharp(filePath, { failOn: 'none' })
  const resized = image.resize(targetSize, targetSize, { fit: 'inside', withoutEnlargement: true })
  const { data, info } = await resized.raw().toBuffer({ resolveWithObject: true })

  return {
    buffer: data,
    width: info.width,
    height: info.height
  }
}

/**
 * Read image as grayscale pixel buffer
 */
export async function readGrayscale(
  filePath: string,
  targetSize: number = 512
): Promise<{ buffer: Buffer; width: number; height: number }> {
  const { data, info } = await sharp(filePath, { failOn: 'none' })
    .resize(targetSize, targetSize, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  return { buffer: data, width: info.width, height: info.height }
}

/**
 * Get image luminance histogram (256 bins)
 */
export async function getLuminanceHistogram(filePath: string): Promise<number[]> {
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize(256, 256, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const histogram = new Array(256).fill(0)
  for (let i = 0; i < data.length; i++) {
    histogram[data[i]]++
  }

  // Normalize
  const total = data.length
  return histogram.map(v => v / total)
}

// --- Helpers ---

function getExifString(tags: any, key: string): string | null {
  const tag = tags[key]
  if (!tag) return null
  if (typeof tag.description === 'string') return tag.description
  if (typeof tag.value === 'string') return tag.value
  if (Array.isArray(tag.value)) return tag.value.join(', ')
  return String(tag.value ?? '')
}

function getExifNumber(tags: any, key: string): number | null {
  const tag = tags[key]
  if (!tag) return null
  const val = tag.value ?? tag.description
  if (typeof val === 'number') return val
  if (typeof val === 'string') {
    const num = parseFloat(val)
    return isNaN(num) ? null : num
  }
  if (Array.isArray(val) && val.length > 0) {
    // Handle rational numbers like [f-number numerator, denominator]
    if (val.length === 2 && typeof val[0] === 'number' && typeof val[1] === 'number') {
      return val[0] / val[1]
    }
    return typeof val[0] === 'number' ? val[0] : null
  }
  return null
}

/**
 * Clean up thumbnails for a session
 */
export function cleanupThumbnails(sessionId: number): void {
  const sessionDir = path.join(THUMBNAIL_DIR, String(sessionId))
  if (fs.existsSync(sessionDir)) {
    fs.rmSync(sessionDir, { recursive: true, force: true })
  }
}
