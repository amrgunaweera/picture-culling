import { ipcMain, dialog, BrowserWindow } from 'electron'
import path from 'path'
import fs from 'fs'
import * as database from './database'
import * as fileManager from './file-manager'
import * as aiEngine from './ai-engine'
import type { PhotoFilters, Flag, ColorLabel, BulkAction } from '../../types'

let analysisAbortController: AbortController | null = null

export function registerIpcHandlers(): void {
  // --- File Operations ---

  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Photo Folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0]
  })

  ipcMain.handle('scan-folder', async (event, folderPath: string) => {
    const folderName = path.basename(folderPath)
    const session = database.createSession(folderPath, folderName)
    const win = BrowserWindow.fromWebContents(event.sender)

    // Scan for files
    const files = await fileManager.scanDirectory(folderPath, (currentFile, count) => {
      win?.webContents.send('scan-progress', {
        total: 0,
        scanned: count,
        currentFile,
        percentage: 0
      })
    })

    const total = files.length

    // Process each file: thumbnail + EXIF
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      try {
        // Generate thumbnail
        const thumbResult = await fileManager.generateThumbnail(file.filePath, session.id)

        // Extract EXIF
        const exif = await fileManager.extractExif(file.filePath)

        // Insert into database
        database.insertPhoto({
          filePath: file.filePath,
          fileName: file.fileName,
          fileSize: file.fileSize,
          modifiedAt: file.modifiedAt,
          width: thumbResult.width,
          height: thumbResult.height,
          thumbnailPath: thumbResult.thumbnailPath,
          sessionId: session.id,
          ...exif
        })
      } catch (err) {
        console.error(`Failed to process ${file.filePath}:`, err)
      }

      // Report progress
      win?.webContents.send('scan-progress', {
        total,
        scanned: i + 1,
        currentFile: file.fileName,
        percentage: Math.round(((i + 1) / total) * 100)
      })
    }

    database.updateSessionCounts(session.id)
    return database.getSessions().find(s => s.id === session.id) || session
  })

  ipcMain.handle('get-photos', (_event, sessionId: number, filters: PhotoFilters) => {
    return database.getPhotos(sessionId, filters)
  })

  ipcMain.handle('get-photo-detail', (_event, id: number) => {
    return database.getPhotoById(id)
  })

  ipcMain.handle('get-photo-full-path', (_event, id: number) => {
    const photo = database.getPhotoById(id)
    return photo?.filePath ?? null
  })

  ipcMain.handle('get-sessions', () => {
    return database.getSessions()
  })

  ipcMain.handle('delete-session', (_event, sessionId: number) => {
    fileManager.cleanupThumbnails(sessionId)
    database.deleteSession(sessionId)
  })

  // --- Culling Actions ---

  ipcMain.handle('set-rating', (_event, id: number, rating: number) => {
    database.setPhotoRating(id, rating)
  })

  ipcMain.handle('set-flag', (_event, id: number, flag: Flag) => {
    database.setPhotoFlag(id, flag)
  })

  ipcMain.handle('set-color-label', (_event, id: number, color: ColorLabel) => {
    database.setPhotoColorLabel(id, color)
  })

  ipcMain.handle('bulk-action', (_event, ids: number[], action: BulkAction) => {
    database.bulkUpdatePhotos(ids, action)
  })

  // --- AI Analysis ---

  ipcMain.handle('start-analysis', async (event, sessionId: number) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    analysisAbortController = new AbortController()
    const signal = analysisAbortController.signal

    const unanalyzed = database.getUnanalyzedPhotos(sessionId)
    const total = unanalyzed.length

    for (let i = 0; i < unanalyzed.length; i++) {
      if (signal.aborted) break

      const photo = unanalyzed[i]

      try {
        const scores = await aiEngine.analyzePhoto(photo.filePath)

        database.updatePhotoScores(photo.id, {
          blurScore: scores.blurScore,
          exposureScore: scores.exposureScore,
          compositeScore: scores.compositeScore,
          phash: scores.phash
        })
      } catch (err) {
        console.error(`Analysis failed for ${photo.filePath}:`, err)
      }

      win?.webContents.send('analysis-progress', {
        sessionId,
        total,
        completed: i + 1,
        currentFile: path.basename(photo.filePath),
        stage: 'blur',
        percentage: Math.round(((i + 1) / total) * 100)
      })
    }

    // After individual analysis, find duplicate groups
    if (!signal.aborted) {
      win?.webContents.send('analysis-progress', {
        sessionId,
        total,
        completed: total,
        currentFile: 'Finding duplicates...',
        stage: 'duplicates',
        percentage: 95
      })

      const hashes = database.getAllPhotoHashes(sessionId)
      const groups = aiEngine.findDuplicateGroups(hashes)

      for (const [groupId, photoIds] of groups) {
        database.setDuplicateGroup(photoIds, groupId)
      }
    }

    database.updateSessionCounts(sessionId)

    win?.webContents.send('analysis-progress', {
      sessionId,
      total,
      completed: total,
      currentFile: '',
      stage: 'complete',
      percentage: 100
    })

    analysisAbortController = null
  })

  ipcMain.handle('stop-analysis', () => {
    analysisAbortController?.abort()
    analysisAbortController = null
  })

  // --- Export Operations ---

  ipcMain.handle('move-rejected', async (_event, sessionId: number, targetDir: string) => {
    const rejected = database.getPhotosByFlag(sessionId, 'reject')
    let moved = 0

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    for (const photo of rejected) {
      try {
        const dest = path.join(targetDir, photo.fileName)
        fs.renameSync(photo.filePath, dest)
        moved++
      } catch (err) {
        console.error(`Failed to move ${photo.filePath}:`, err)
      }
    }

    return moved
  })

  ipcMain.handle('export-picked', async (_event, sessionId: number, targetDir: string) => {
    const picked = database.getPhotosByFlag(sessionId, 'pick')
    let exported = 0

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true })
    }

    for (const photo of picked) {
      try {
        const dest = path.join(targetDir, photo.fileName)
        fs.copyFileSync(photo.filePath, dest)
        exported++
      } catch (err) {
        console.error(`Failed to export ${photo.filePath}:`, err)
      }
    }

    return exported
  })

  // --- Serve local files (for image display in renderer) ---

  ipcMain.handle('get-file-url', (_event, filePath: string) => {
    // Return a file:// URL that the renderer can use in <img> tags
    return `file://${filePath.replace(/\\/g, '/')}`
  })
}
