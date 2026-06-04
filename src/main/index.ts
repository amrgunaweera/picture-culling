import { app, BrowserWindow, shell, protocol, net, dialog } from 'electron'
import path from 'path'
import fs from 'fs'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { ensureThumbnailDir } from './file-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  const options: Electron.BrowserWindowConstructorOptions = {
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'Cullexa Picture Organizer',
    backgroundColor: '#0f0f1a',
    show: false,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f0f1a',
      symbolColor: '#a0a0b8',
      height: 40
    },
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false // Allow loading local file:// images
    }
  }

  const iconPath = path.join(__dirname, '../../resources/icon.jpg')
  if (fs.existsSync(iconPath)) {
    options.icon = iconPath
  }

  mainWindow = new BrowserWindow(options)

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
    mainWindow?.maximize()
    mainWindow?.show()
  })

  // Open external links in default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Load the renderer
  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }
}

import { pathToFileURL } from 'url'

// Register custom protocol for serving local images
// IMPORTANT: URLs must use triple-slash (local-file:///C:/...) so Chromium
// does not interpret the Windows drive letter as a URL hostname.
function registerLocalFileProtocol(): void {
  protocol.handle('local-file', (request) => {
    // Strip the protocol prefix (local-file:///) leaving an encoded absolute path
    // e.g. local-file:///C:/Users/foo/bar%20baz.jpg -> C:/Users/foo/bar%20baz.jpg
    let filePath = request.url.slice('local-file:///'.length)
    // Decode percent-encoding so pathToFileURL gets a real filesystem path
    filePath = decodeURIComponent(filePath)
    // pathToFileURL correctly re-encodes special chars for net.fetch
    return net.fetch(pathToFileURL(filePath).toString())
  })
}

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    // Focus the existing main window if launched again
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
  })

  app.whenReady().then(async () => {
    try {
      // Initialize database
      await initDatabase()
      ensureThumbnailDir()

      // Register IPC handlers
      registerIpcHandlers()

      // Register custom protocol
      registerLocalFileProtocol()

      // Create main window
      createWindow()

      app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow()
      })
    } catch (error) {
      console.error('Fatal startup error:', error)
      dialog.showErrorBox(
        'Startup Error',
        `Cullexa Picture Organizer failed to start:\n\n${error instanceof Error ? error.stack : String(error)}`
      )
      app.quit()
    }
  })
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
