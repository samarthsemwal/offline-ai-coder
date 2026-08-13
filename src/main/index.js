/**
 * Electron Main Process — src/main/index.js
 *
 * Responsibilities:
 *  1. Check if Ollama is running on startup; if not, spawn `ollama serve`
 *     and wait until it's ready (with timeout + backoff).
 *  2. Create the BrowserWindow with secure settings.
 *  3. Register IPC handlers for all file-system storage operations
 *     (session CRUD) so the renderer never touches Node's `fs` directly.
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  shell,
  session
} = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const http = require('http')

// ─── Config ──────────────────────────────────────────────────────────────────

const OLLAMA_HOST = 'http://localhost:11434'
const OLLAMA_HEALTH_URL = `${OLLAMA_HOST}/api/tags`
const WINDOW_WIDTH = 1280
const WINDOW_HEIGHT = 820
const OLLAMA_STARTUP_TIMEOUT_MS = 30_000  // 30 seconds max wait for ollama serve
const OLLAMA_POLL_INTERVAL_MS = 800        // check every 800ms

// ─── Globals ─────────────────────────────────────────────────────────────────

let mainWindow = null
let ollamaProcess = null  // reference to spawned `ollama serve` child process

// ─── Ollama Health Check ──────────────────────────────────────────────────────

/**
 * Returns a Promise that resolves to `true` if Ollama is responding,
 * `false` if the connection is refused or times out.
 */
function checkOllamaHealth () {
  return new Promise((resolve) => {
    const req = http.get(OLLAMA_HEALTH_URL, { timeout: 2000 }, (res) => {
      resolve(res.statusCode < 500)
    })
    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

/**
 * Polls `checkOllamaHealth` until it returns true or the timeout elapses.
 * Used after spawning `ollama serve` to know when it's ready.
 *
 * @returns {Promise<boolean>} true if Ollama started in time, false if timeout
 */
function waitForOllama () {
  return new Promise((resolve) => {
    const deadline = Date.now() + OLLAMA_STARTUP_TIMEOUT_MS
    const poll = async () => {
      const ok = await checkOllamaHealth()
      if (ok) return resolve(true)
      if (Date.now() >= deadline) return resolve(false)
      setTimeout(poll, OLLAMA_POLL_INTERVAL_MS)
    }
    poll()
  })
}

/**
 * Tries to start Ollama if it's not already running.
 *
 * @returns {Promise<{ started: boolean, alreadyRunning: boolean }>}
 */
async function ensureOllamaRunning () {
  const alreadyRunning = await checkOllamaHealth()
  if (alreadyRunning) return { started: true, alreadyRunning: true }

  console.log('[main] Ollama not running — attempting to spawn `ollama serve`...')

  // Try to find ollama binary in common locations
  const ollamaBinary = process.platform === 'darwin'
    ? '/usr/local/bin/ollama'
    : 'ollama'

  try {
    ollamaProcess = spawn(ollamaBinary, ['serve'], {
      detached: false,   // keep alive only while our app is running
      stdio: 'ignore'    // don't attach stdout/stderr to avoid blocking
    })

    ollamaProcess.on('error', (err) => {
      console.error('[main] Failed to spawn ollama serve:', err.message)
    })

    // Wait for Ollama to be ready
    const started = await waitForOllama()
    return { started, alreadyRunning: false }
  } catch (err) {
    console.error('[main] Error launching Ollama:', err)
    return { started: false, alreadyRunning: false }
  }
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

/**
 * Returns the directory where chat sessions are stored.
 * Creates it if it doesn't exist yet.
 */
function getSessionsDir () {
  const dir = path.join(app.getPath('userData'), 'sessions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Returns the file path for a given session id.
 * @param {string} id - UUID of the session
 */
function getSessionPath (id) {
  return path.join(getSessionsDir(), `${id}.json`)
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

/** List all session metadata (id, title, createdAt, updatedAt, model) */
ipcMain.handle('storage:list-sessions', () => {
  const dir = getSessionsDir()
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const sessions = files.map(file => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'))
      // Return only the metadata, not the full messages array (for performance)
      return {
        id: data.id,
        title: data.title,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        model: data.model,
        messageCount: data.messages?.length ?? 0
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  // Sort by most recently updated
  return sessions.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
})

/** Load a full session (including all messages) by id */
ipcMain.handle('storage:load-session', (_event, id) => {
  const filePath = getSessionPath(id)
  if (!fs.existsSync(filePath)) return null
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch {
    return null
  }
})

/** Save (create or update) a session — upsert by id */
ipcMain.handle('storage:save-session', (_event, session) => {
  const filePath = getSessionPath(session.id)
  fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8')
  return true
})

/** Delete a single session file */
ipcMain.handle('storage:delete-session', (_event, id) => {
  const filePath = getSessionPath(id)
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
  return true
})

/** Delete ALL session files in the sessions directory */
ipcMain.handle('storage:delete-all', () => {
  const dir = getSessionsDir()
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  files.forEach(f => fs.unlinkSync(path.join(dir, f)))
  return true
})

/** Check Ollama status from renderer (used for header status indicator) */
ipcMain.handle('ollama:check-status', async () => {
  return checkOllamaHealth()
})

// ─── Window Creation ──────────────────────────────────────────────────────────

function createWindow () {
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hiddenInset',  // macOS native traffic lights + custom titlebar
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0d1117',    // match CSS --bg-primary to avoid flash
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,   // security: renderer can't access Node APIs directly
      nodeIntegration: false,   // security: no require() in renderer
      sandbox: false,           // required for preload script to work
      webSecurity: true
    },
    show: false  // don't show until ready-to-show to avoid flash
  })

  // Set Content Security Policy to allow localhost Ollama calls
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; " +
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
          "font-src 'self' https://fonts.gstatic.com data:; " +
          "connect-src 'self' http://localhost:11434 https:; " +
          "worker-src 'self' blob:; " +
          "img-src 'self' data: blob:;"
        ]
      }
    })
  })

  // Load the React app
  if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
    // In dev mode, electron-vite serves the renderer on a local port
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Show window once the page is ready (prevents white flash)
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()
  })

  // Pipe renderer console logs to the main terminal for debugging
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[Renderer] ${message}`)
  })

  // Clean up ollama process when app closes (if we started it)
  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open external links in the system browser, not in Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // macOS: Request microphone permission for voice typing
  if (process.platform === 'darwin') {
    const { systemPreferences } = require('electron')
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }

  // Try to ensure Ollama is running before showing the UI
  // The UI will show regardless (it handles the "not connected" state gracefully)
  ensureOllamaRunning().then(({ started, alreadyRunning }) => {
    if (!started) {
      console.warn('[main] Ollama could not be started. App will show disconnected state.')
    } else {
      console.log(`[main] Ollama is ready (${alreadyRunning ? 'already running' : 'just started'}).`)
    }
  })

  createWindow()

  // macOS: re-create window when dock icon is clicked and no windows are open
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  // Kill the Ollama process we spawned (if any) when the app closes
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill()
  }
  // On macOS, quit when all windows are closed (unlike the default behavior)
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill()
  }
})
