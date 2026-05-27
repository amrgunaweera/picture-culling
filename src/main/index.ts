import { app, BrowserWindow, shell, protocol, net } from 'electron'
import path from 'path'
import { initDatabase } from './database'
import { registerIpcHandlers } from './ipc-handlers'
import { ensureThumbnailDir } from './file-manager'

let mainWindow: BrowserWindow | null = null

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    title: 'PictureCull',
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
  })

  // Show window when ready
  mainWindow.on('ready-to-show', () => {
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

// Register custom protocol for serving local images
function registerLocalFileProtocol(): void {
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''))
    return net.fetch(`file://${filePath}`)
  })
}

app.whenReady().then(async () => {
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
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
