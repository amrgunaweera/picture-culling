import { ipcMain, dialog, BrowserWindow, shell, app } from 'electron'
import path from 'path'
import fs from 'fs'
import * as database from './database'
import * as fileManager from './file-manager'
import * as aiEngine from './ai-engine'
import type { PhotoFilters, Flag, ColorLabel, BulkAction } from '../types'

let analysisAbortController: AbortController | null = null

export function registerIpcHandlers(): void {
  // --- File Operations ---

  ipcMain.handle('open-folder-dialog', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'tiff', 'tif', 'webp', 'bmp', 'cr2', 'cr3', 'nef', 'arw', 'orf', 'rw2', 'dng', 'raf'] }
      ],
      title: 'Select any image inside the folder you want to open',
      buttonLabel: 'Open Folder'
    })
    if (result.canceled || result.filePaths.length === 0) return null
    return path.dirname(result.filePaths[0])
  })

  ipcMain.handle('scan-folder', async (event, folderPath: string) => {
    const folderName = path.basename(folderPath)

    let session = database.getSessions().find(s => s.folderPath === folderPath)
    if (!session) {
      session = database.createSession(folderPath, folderName)
    } else {
      // Clear existing photos so a rescan always starts fresh
      database.clearSessionPhotos(session.id)
    }
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

    // Process each file: insert first, then generate thumbnail + EXIF
    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Always extract EXIF (best-effort)
      let exif = {}
      try {
        exif = await fileManager.extractExif(file.filePath)
      } catch {
        // Non-fatal: proceed without EXIF
      }

      // Insert the photo record immediately so it always appears in the grid,
      // even if thumbnail generation fails later.
      let photoId: number | null = null
      try {
        photoId = database.insertPhoto({
          filePath: file.filePath,
          fileName: file.fileName,
          fileSize: file.fileSize,
          modifiedAt: file.modifiedAt,
          width: 0,
          height: 0,
          thumbnailPath: null,
          sessionId: session.id,
          ...exif
        })
      } catch (err) {
        console.error(`Failed to insert ${file.filePath}:`, err)
      }

      // Attempt thumbnail generation separately — failure won't block the photo
      if (photoId) {
        try {
          const thumbResult = await fileManager.generateThumbnail(file.filePath, session.id)
          if (thumbResult.thumbnailPath) {
            database.updatePhotoThumbnail(photoId, thumbResult.thumbnailPath, thumbResult.width, thumbResult.height)
          }
        } catch (err) {
          console.error(`Thumbnail failed for ${file.filePath}:`, err)
        }
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
          aestheticScore: scores.aestheticScore,
          compositeScore: scores.compositeScore,
          phash: scores.phash,
          faceCount: scores.faceCount
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

  ipcMain.handle('delete-rejected', async (_event, sessionId: number) => {
    const rejected = database.getPhotosByFlag(sessionId, 'reject')
    const deletedIds: number[] = []

    for (const photo of rejected) {
      try {
        if (fs.existsSync(photo.filePath)) {
          await shell.trashItem(photo.filePath)
        }
        deletedIds.push(photo.id)
      } catch (err) {
        console.error(`Failed to trash ${photo.filePath}:`, err)
      }
    }

    if (deletedIds.length > 0) {
      database.deletePhotos(deletedIds)
    }

    return deletedIds.length
  })

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

  // --- Feedback ---

  ipcMain.handle('report-issue', async (event, id: number, issueType: string, customMessage?: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win) return

    try {
      const reportsDir = path.join(app.getPath('userData'), 'reports')
      if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true })
      }

      const photo = database.getPhotoById(id)
      const reportData = {
        photoId: id,
        fileName: photo?.fileName ?? 'Unknown',
        filePath: photo?.filePath ?? 'Unknown',
        aiScores: photo ? {
          blurScore: photo.blurScore,
          exposureScore: photo.exposureScore,
          aestheticScore: photo.aestheticScore,
          compositeScore: photo.compositeScore
        } : null,
        issueType,
        customMessage: customMessage || undefined,
        reportedAt: new Date().toISOString()
      }

      const reportPath = path.join(reportsDir, `report-${id}-${Date.now()}.json`)
      fs.writeFileSync(reportPath, JSON.stringify(reportData, null, 2))

      const email = 'boldstamina@gmail.com'
      const subject = `AI Content Report: ${issueType}`
      const body = `Please review the following AI-generated output:\n\n` +
        `Issue Type: ${issueType}\n` +
        (customMessage ? `Custom Message: ${customMessage}\n\n` : '') +
        `Photo ID: ${id}\n` +
        `File Name: ${photo?.fileName ?? 'Unknown'}\n` +
        `File Path: ${photo?.filePath ?? 'Unknown'}\n\n` +
        `AI Scores:\n${JSON.stringify(reportData.aiScores, null, 2)}\n\n` +
        `Additional Details:\n`

      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
      await shell.openExternal(mailtoLink)

      await dialog.showMessageBox(win, {
        type: 'info',
        title: 'Report Prepared',
        message: 'Your default email client will open to send this report.',
        detail: `A local backup was also saved to: ${reportPath}`
      })
    } catch (err) {
      console.error('Failed to prepare AI report:', err)
      await dialog.showMessageBox(win, {
        type: 'error',
        title: 'Error',
        message: 'Failed to prepare the report email. Please try again.'
      })
    }
  })
}
