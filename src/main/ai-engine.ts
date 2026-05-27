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

/**
 * Analyze a single photo through all stages.
 * Returns all computed scores.
 */
export async function analyzePhoto(filePath: string): Promise<{
  blurScore: number
  exposureScore: number
  phash: string
  compositeScore: number
}> {
  const [blurScore, exposureScore, phash] = await Promise.all([
    detectBlur(filePath),
    analyzeExposure(filePath),
    generatePerceptualHash(filePath)
  ])

  const compositeScore = calculateCompositeScore({ blurScore, exposureScore })

  return {
    blurScore,
    exposureScore,
    phash,
    compositeScore
  }
}
