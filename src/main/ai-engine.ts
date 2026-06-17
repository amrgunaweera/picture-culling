/**
 * AI Analysis Engine
 *
 * Performs image quality analysis using lightweight, local algorithms:
 * - Blur detection via Laplacian variance
 * - Exposure analysis via histogram
 * - Duplicate detection via perceptual hashing (dHash)
 * - Composite scoring
 *
 * Runs in the main process but designed to be called from worker thread context
 */

import sharp from 'sharp'
import * as tf from '@tensorflow/tfjs'
import * as blazeface from '@tensorflow-models/blazeface'

// ============================================================================
// BLUR DETECTION — Laplacian Variance
// ============================================================================

/**
 * Detect blur using Laplacian variance.
 * High variance = sharp image, low variance = blurry
 * Returns a normalized score from 0 (very blurry) to 1 (very sharp)
 */
export async function detectBlur(filePath: string): Promise<number> {
  // Load image as grayscale, resized for speed
  const { data, info } = await sharp(filePath, { failOn: 'none' })
    .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const { width, height } = info

  // Apply Laplacian kernel: [0, 1, 0; 1, -4, 1; 0, 1, 0]
  let sum = 0
  let sumSq = 0
  let count = 0

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x
      const laplacian =
        -4 * data[idx] +
        data[(y - 1) * width + x] +
        data[(y + 1) * width + x] +
        data[y * width + (x - 1)] +
        data[y * width + (x + 1)]

      sum += laplacian
      sumSq += laplacian * laplacian
      count++
    }
  }

  const mean = sum / count
  const variance = sumSq / count - mean * mean

  // Normalize: typical sharp images have variance 500-2000+
  // Blurry images have variance < 100
  // Use a sigmoid-like mapping
  const normalizedScore = Math.min(1, Math.max(0, variance / 1500))

  return normalizedScore
}

// ============================================================================
// EXPOSURE ANALYSIS — Histogram-based
// ============================================================================

/**
 * Analyze exposure quality using luminance histogram.
 * Checks for clipping, overall balance, and dynamic range.
 * Returns 0 (badly exposed) to 1 (well exposed)
 */
export async function analyzeExposure(filePath: string): Promise<number> {
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize(256, 256, { fit: 'inside' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Build histogram
  const histogram = new Array(256).fill(0)
  for (let i = 0; i < data.length; i++) {
    histogram[data[i]]++
  }

  const totalPixels = data.length

  // 1. Check shadow clipping (pixels in 0-10 range)
  let shadowClip = 0
  for (let i = 0; i <= 10; i++) shadowClip += histogram[i]
  const shadowClipRatio = shadowClip / totalPixels

  // 2. Check highlight clipping (pixels in 245-255 range)
  let highlightClip = 0
  for (let i = 245; i <= 255; i++) highlightClip += histogram[i]
  const highlightClipRatio = highlightClip / totalPixels

  // 3. Calculate mean brightness (ideal ~128)
  let brightSum = 0
  for (let i = 0; i < 256; i++) brightSum += i * histogram[i]
  const meanBrightness = brightSum / totalPixels

  // 4. Calculate dynamic range (used bins)
  let minBin = 255, maxBin = 0
  for (let i = 0; i < 256; i++) {
    if (histogram[i] > totalPixels * 0.001) { // At least 0.1% of pixels
      minBin = Math.min(minBin, i)
      maxBin = Math.max(maxBin, i)
    }
  }
  const dynamicRange = (maxBin - minBin) / 255

  // Score components
  const clipPenalty = Math.max(0, 1 - (shadowClipRatio * 3) - (highlightClipRatio * 3))
  const brightnessPenalty = 1 - Math.abs(meanBrightness - 128) / 128
  const rangePenalty = Math.min(1, dynamicRange * 1.5) // Reward wide dynamic range

  // Weighted composite
  const score = clipPenalty * 0.4 + brightnessPenalty * 0.3 + rangePenalty * 0.3

  return Math.min(1, Math.max(0, score))
}

// ============================================================================
// AESTHETIC SCORING
// ============================================================================

/**
 * Calculate a basic aesthetic score based on colorfulness/saturation.
 * Uses a simplified metric (Hasler and Süsstrunk).
 * Returns 0 (dull/grayscale) to 1 (highly colorful/aesthetic).
 */
export async function analyzeAesthetics(filePath: string): Promise<number> {
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize(256, 256, { fit: 'inside' })
    .ensureAlpha() // ensure we have RGBA channels for predictable iteration
    .raw()
    .toBuffer({ resolveWithObject: true })

  let sumRg = 0, sumYb = 0
  let count = 0

  // We need to iterate over RGBA
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const rg = r - g
    const yb = 0.5 * (r + g) - b

    sumRg += rg
    sumYb += yb
    count++
  }

  const meanRg = sumRg / count
  const meanYb = sumYb / count

  let sumSqRg = 0
  let sumSqYb = 0

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]

    const rg = r - g
    const yb = 0.5 * (r + g) - b

    sumSqRg += (rg - meanRg) * (rg - meanRg)
    sumSqYb += (yb - meanYb) * (yb - meanYb)
  }

  const stdRg = Math.sqrt(sumSqRg / count)
  const stdYb = Math.sqrt(sumSqYb / count)

  const stdRoot = Math.sqrt(stdRg * stdRg + stdYb * stdYb)
  const meanRoot = Math.sqrt(meanRg * meanRg + meanYb * meanYb)

  // Colorfulness metric
  const colorfulness = stdRoot + 0.3 * meanRoot

  // Normalize: 0 to ~100 range mapped to 0-1
  // We'll cap it at 1. Typical photos score between 15 and 80.
  // Add a slight boost so normal photos get a decent score.
  let score = colorfulness / 80
  
  return Math.min(1, Math.max(0, score))
}

// ============================================================================
// DUPLICATE DETECTION — Perceptual Hash (dHash)
// ============================================================================

/**
 * Generate a perceptual hash (difference hash) for an image.
 * dHash compares adjacent pixel brightness differences.
 * Returns a 64-character hex string (256 bits)
 */
export async function generatePerceptualHash(filePath: string): Promise<string> {
  // Resize to 17x16 (one extra column for difference calculation)
  const { data } = await sharp(filePath, { failOn: 'none' })
    .resize(17, 16, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true })

  // Generate hash by comparing adjacent pixels
  const bits: number[] = []
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) {
      const left = data[y * 17 + x]
      const right = data[y * 17 + x + 1]
      bits.push(left < right ? 1 : 0)
    }
  }

  // Convert bits to hex string
  let hex = ''
  for (let i = 0; i < bits.length; i += 4) {
    const nibble = (bits[i] << 3) | (bits[i + 1] << 2) | (bits[i + 2] << 1) | bits[i + 3]
    hex += nibble.toString(16)
  }

  return hex
}

/**
 * Calculate Hamming distance between two perceptual hashes.
 * Low distance = similar images.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) return Infinity

  let distance = 0
  for (let i = 0; i < hash1.length; i++) {
    const n1 = parseInt(hash1[i], 16)
    const n2 = parseInt(hash2[i], 16)
    // Count differing bits
    let xor = n1 ^ n2
    while (xor > 0) {
      distance += xor & 1
      xor >>= 1
    }
  }

  return distance
}

/**
 * Find duplicate groups from a list of photo hashes.
 * Returns groups of photo IDs that are near-duplicates.
 */
export function findDuplicateGroups(
  photos: { id: number; phash: string }[],
  threshold: number = 10
): Map<number, number[]> {
  const groups = new Map<number, number[]>()
  const assigned = new Set<number>()
  let groupId = 1

  for (let i = 0; i < photos.length; i++) {
    if (assigned.has(photos[i].id)) continue

    const group: number[] = [photos[i].id]
    assigned.add(photos[i].id)

    for (let j = i + 1; j < photos.length; j++) {
      if (assigned.has(photos[j].id)) continue

      const dist = hammingDistance(photos[i].phash, photos[j].phash)
      if (dist <= threshold) {
        group.push(photos[j].id)
        assigned.add(photos[j].id)
      }
    }

    if (group.length > 1) {
      groups.set(groupId, group)
      groupId++
    }
  }

  return groups
}

// ============================================================================
// COMPOSITE SCORING
// ============================================================================

/**
 * Calculate composite quality score from individual metrics
 */
export function calculateCompositeScore(scores: {
  blurScore: number
  exposureScore: number
  aestheticScore?: number
  faceCount?: number
}): number {
  const blur = scores.blurScore
  const exposure = scores.exposureScore
  const aesthetic = scores.aestheticScore ?? 0.5 // Default to neutral
  const faceBonus = scores.faceCount && scores.faceCount > 0 ? 0.1 : 0 // Small bonus for photos with faces

  const composite = (blur * 0.40) + (exposure * 0.25) + (aesthetic * 0.25) + faceBonus

  return Math.min(1, Math.max(0, composite))
}

// Track whether face detection is available (TF.js requires tfjs-node in main process)
let faceModel: blazeface.BlazeFaceModel | null = null
let faceDetectionUnavailable = false

export async function detectFaces(filePath: string): Promise<number> {
  if (faceDetectionUnavailable) return 0

  if (!faceModel) {
    try {
      await tf.ready()
      faceModel = await blazeface.load()
    } catch (e) {
      console.warn('BlazeFace unavailable (TF.js requires tfjs-node in main process):', (e as Error).message)
      faceDetectionUnavailable = true
      return 0
    }
  }

  try {
    const { data, info } = await sharp(filePath, { failOn: 'none' })
      .resize(800, 800, { fit: 'inside' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const numChannels = 3
    const numPixels = info.width * info.height
    const values = new Int32Array(numPixels * numChannels)

    for (let i = 0; i < numPixels * numChannels; i++) {
      values[i] = data[i]
    }

    const tensor = tf.tensor3d(values, [info.height, info.width, numChannels], 'int32')
    const faces = await faceModel.estimateFaces(tensor, false)
    tensor.dispose()

    return faces.length
  } catch (e) {
    console.error('Failed to detect faces:', e)
    return 0
  }
}

/**
 * Analyze a single photo through all stages.
 * Face detection runs separately so its failure never blocks
 * blur/exposure/phash from completing successfully.
 */
export async function analyzePhoto(filePath: string): Promise<{
  blurScore: number
  exposureScore: number
  aestheticScore: number
  phash: string
  faceCount: number
  compositeScore: number
}> {
  // Run core metrics together — these only depend on sharp and never fail hard
  const [blurScore, exposureScore, aestheticScore, phash] = await Promise.all([
    detectBlur(filePath),
    analyzeExposure(filePath),
    analyzeAesthetics(filePath),
    generatePerceptualHash(filePath)
  ])

  // Face detection is optional — isolate it so any TF.js crash can't reject the whole call
  let faceCount = 0
  try {
    faceCount = await detectFaces(filePath)
  } catch {
    // Non-fatal: proceed with faceCount = 0
  }

  const compositeScore = calculateCompositeScore({ blurScore, exposureScore, aestheticScore, faceCount })

  return {
    blurScore,
    exposureScore,
    aestheticScore,
    phash,
    faceCount,
    compositeScore
  }
}
