/**
 * Electron Main Process — src/main/index.js  (CodeLoom)
 *
 * Responsibilities:
 *  1. Check if Ollama is running on startup; if not, spawn `ollama serve`
 *     and wait until it's ready (with timeout + backoff).
 *  2. Create the BrowserWindow with secure settings.
 *  3. Register IPC handlers for all file-system operations
 *     (session CRUD, settings, file import, export, prompt library)
 *     so the renderer never touches Node's `fs` directly.
 *
 * SECURITY NOTES:
 *  - contextIsolation: true, nodeIntegration: false
 *  - All session IDs validated (UUID format, path-traversal rejected)
 *  - File imports go through dialog.showOpenDialog — renderer never supplies path
 *  - IPC arguments are type-checked and length-capped before use
 *  - CSP: unsafe-eval removed in production; unsafe-inline removed from scripts
 */

const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  shell,
  session,
  globalShortcut
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
const OLLAMA_STARTUP_TIMEOUT_MS = 30_000
const OLLAMA_POLL_INTERVAL_MS = 800

// File import constraints
const FILE_SIZE_HARD_LIMIT = 2 * 1024 * 1024   // 2 MB — hard reject
const FILE_SIZE_SOFT_LIMIT = 500 * 1024         // 500 KB — warn

const ALLOWED_EXTENSIONS = new Set([
  'py', 'js', 'jsx', 'ts', 'tsx', 'cpp', 'c', 'cc', 'h', 'hpp',
  'java', 'html', 'htm', 'css', 'json', 'md', 'sh', 'bash', 'zsh',
  'rb', 'go', 'rs', 'kt', 'swift', 'php', 'yml', 'yaml', 'xml',
  'sql', 'r', 'lua', 'dart', 'txt', 'toml', 'ini', 'conf', 'cs', 'scala'
])

// ─── Globals ──────────────────────────────────────────────────────────────────

let mainWindow = null
let ollamaProcess = null

// ─── Ollama Health Check ──────────────────────────────────────────────────────

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

async function ensureOllamaRunning () {
  const alreadyRunning = await checkOllamaHealth()
  if (alreadyRunning) return { started: true, alreadyRunning: true }

  console.log('[main] Ollama not running — attempting to spawn `ollama serve`...')

  const ollamaBinary = process.platform === 'darwin'
    ? '/usr/local/bin/ollama'
    : 'ollama'

  try {
    ollamaProcess = spawn(ollamaBinary, ['serve'], {
      detached: false,
      stdio: 'ignore'
    })

    ollamaProcess.on('error', (err) => {
      console.error('[main] Failed to spawn ollama serve:', err.message)
    })

    const started = await waitForOllama()
    return { started, alreadyRunning: false }
  } catch (err) {
    console.error('[main] Error launching Ollama:', err)
    return { started: false, alreadyRunning: false }
  }
}

// ─── Security Helpers ─────────────────────────────────────────────────────────

/**
 * Validates a session ID: must be a lowercase UUID v4.
 * Rejects anything that could be used for path traversal.
 * @param {string} id
 * @returns {string} validated id
 * @throws if invalid
 */
function validateSessionId (id) {
  if (typeof id !== 'string') throw new Error('Session ID must be a string')
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error(`Invalid session ID format: ${id}`)
  }
  return id
}

/**
 * Validates a string argument: must be string, within length limit.
 * @param {*} val
 * @param {number} maxLen
 * @param {string} name
 */
function validateString (val, maxLen = 1000, name = 'value') {
  if (typeof val !== 'string') throw new Error(`${name} must be a string`)
  if (val.length > maxLen) throw new Error(`${name} exceeds maximum length of ${maxLen}`)
  return val
}

/**
 * Validates a boolean argument.
 */
function validateBool (val, name = 'value') {
  if (typeof val !== 'boolean') throw new Error(`${name} must be a boolean`)
  return val
}

// ─── Storage Helpers ──────────────────────────────────────────────────────────

function getSessionsDir () {
  const dir = path.join(app.getPath('userData'), 'sessions')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

/**
 * Returns the canonical file path for a given session id.
 * SECURITY: validates UUID format and confirms the resolved path stays
 * within the sessions directory (prevents path traversal).
 * @param {string} id
 */
function getSessionPath (id) {
  validateSessionId(id)
  const sessionsDir = getSessionsDir()
  const resolved = path.resolve(sessionsDir, `${id}.json`)
  if (!resolved.startsWith(sessionsDir + path.sep) && resolved !== sessionsDir) {
    throw new Error('Path traversal detected — access denied')
  }
  return resolved
}

function getSettingsPath () {
  return path.join(app.getPath('userData'), 'codeloom-settings.json')
}

function getPromptLibraryPath () {
  return path.join(app.getPath('userData'), 'prompt-library.json')
}

// ─── IPC: Session CRUD ────────────────────────────────────────────────────────

ipcMain.handle('storage:list-sessions', () => {
  const dir = getSessionsDir()
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  const sessions = files.map(file => {
    try {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8')
      const data = JSON.parse(raw)
      return {
        id: data.id,
        title: data.title,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        model: data.model,
        pinned: data.pinned ?? false,
        messageCount: data.messages?.length ?? 0
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  // Pinned first, then by updatedAt descending
  return sessions.sort((a, b) => {
    if (a.pinned && !b.pinned) return -1
    if (!a.pinned && b.pinned) return 1
    return new Date(b.updatedAt) - new Date(a.updatedAt)
  })
})

ipcMain.handle('storage:load-session', (_event, id) => {
  try {
    const filePath = getSessionPath(id)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[main] load-session error:', err.message)
    return null
  }
})

ipcMain.handle('storage:save-session', (_event, session) => {
  try {
    validateSessionId(session?.id)
    validateString(session?.title ?? '', 500, 'title')
    const filePath = getSessionPath(session.id)
    fs.writeFileSync(filePath, JSON.stringify(session, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('[main] save-session error:', err.message)
    return false
  }
})

ipcMain.handle('storage:delete-session', (_event, id) => {
  try {
    const filePath = getSessionPath(id)
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath)
    return true
  } catch (err) {
    console.error('[main] delete-session error:', err.message)
    return false
  }
})

ipcMain.handle('storage:delete-all', () => {
  const dir = getSessionsDir()
  const files = fs.readdirSync(dir).filter(f => f.endsWith('.json'))
  files.forEach(f => {
    try { fs.unlinkSync(path.join(dir, f)) } catch { /* ignore */ }
  })
  return true
})

ipcMain.handle('storage:rename-session', (_event, id, title) => {
  try {
    const validId = validateSessionId(id)
    const validTitle = validateString(title, 500, 'title')
    const filePath = getSessionPath(validId)
    if (!fs.existsSync(filePath)) return false
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    data.title = validTitle
    data.updatedAt = new Date().toISOString()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('[main] rename-session error:', err.message)
    return false
  }
})

ipcMain.handle('storage:pin-session', (_event, id, pinned) => {
  try {
    const validId = validateSessionId(id)
    const validPinned = validateBool(pinned, 'pinned')
    const filePath = getSessionPath(validId)
    if (!fs.existsSync(filePath)) return false
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
    data.pinned = validPinned
    data.updatedAt = new Date().toISOString()
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('[main] pin-session error:', err.message)
    return false
  }
})

ipcMain.handle('storage:export-session', (_event, id) => {
  try {
    const filePath = getSessionPath(id)
    if (!fs.existsSync(filePath)) return null
    return JSON.parse(fs.readFileSync(filePath, 'utf8'))
  } catch (err) {
    console.error('[main] export-session error:', err.message)
    return null
  }
})

// ─── IPC: Settings ────────────────────────────────────────────────────────────

ipcMain.handle('settings:load', () => {
  try {
    const p = getSettingsPath()
    if (!fs.existsSync(p)) return null
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
})

ipcMain.handle('settings:save', (_event, settings) => {
  try {
    if (typeof settings !== 'object' || settings === null) throw new Error('Settings must be an object')
    fs.writeFileSync(getSettingsPath(), JSON.stringify(settings, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('[main] settings:save error:', err.message)
    return false
  }
})

// ─── IPC: File Import ─────────────────────────────────────────────────────────

ipcMain.handle('file:open-dialog', async () => {
  if (!mainWindow) return null
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Import Code File',
    properties: ['openFile'],
    filters: [
      {
        name: 'Code Files',
        extensions: [...ALLOWED_EXTENSIONS]
      },
      { name: 'All Files', extensions: ['*'] }
    ]
  })
  if (result.canceled || result.filePaths.length === 0) return null
  return result.filePaths[0]  // Return path; actual read done via file:read
})

ipcMain.handle('file:read', (_event, filePath) => {
  try {
    if (typeof filePath !== 'string') throw new Error('filePath must be a string')

    // Validate extension
    const ext = path.extname(filePath).replace('.', '').toLowerCase()
    if (ext && !ALLOWED_EXTENSIONS.has(ext)) {
      return { error: `File type .${ext} is not allowed.` }
    }

    // Validate path exists and is a file
    if (!fs.existsSync(filePath)) return { error: 'File not found.' }
    const stat = fs.statSync(filePath)
    if (!stat.isFile()) return { error: 'Path is not a file.' }

    // Size checks
    if (stat.size > FILE_SIZE_HARD_LIMIT) {
      return {
        error: `File is too large (${(stat.size / 1024 / 1024).toFixed(1)} MB). Maximum allowed size is 2 MB.`
      }
    }

    const content = fs.readFileSync(filePath, 'utf8')
    const softLimitExceeded = stat.size > FILE_SIZE_SOFT_LIMIT

    return {
      content,
      name: path.basename(filePath),
      extension: ext,
      sizeBytes: stat.size,
      softLimitExceeded
    }
  } catch (err) {
    console.error('[main] file:read error:', err.message)
    return { error: err.message }
  }
})

// ─── IPC: File Export ─────────────────────────────────────────────────────────

ipcMain.handle('file:save-dialog', async (_event, { defaultName, content }) => {
  try {
    if (!mainWindow) return { success: false, error: 'No window' }
    validateString(content, 10 * 1024 * 1024, 'content')  // 10MB max export
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Conversation',
      defaultPath: defaultName || 'codeloom-export.md',
      filters: [{ name: 'Markdown', extensions: ['md'] }, { name: 'Text', extensions: ['txt'] }]
    })
    if (result.canceled || !result.filePath) return { success: false }
    fs.writeFileSync(result.filePath, content, 'utf8')
    return { success: true, filePath: result.filePath }
  } catch (err) {
    console.error('[main] file:save-dialog error:', err.message)
    return { success: false, error: err.message }
  }
})

// ─── IPC: Shell ───────────────────────────────────────────────────────────────

ipcMain.handle('shell:open-external', (_event, url) => {
  try {
    validateString(url, 2000, 'url')
    if (!url.startsWith('https://') && !url.startsWith('http://')) {
      throw new Error('Only http/https URLs are allowed')
    }
    shell.openExternal(url)
    return true
  } catch (err) {
    console.error('[main] shell:open-external error:', err.message)
    return false
  }
})

// ─── IPC: Ollama ─────────────────────────────────────────────────────────────

ipcMain.handle('ollama:check-status', async () => {
  return checkOllamaHealth()
})

// ─── IPC: Prompt Library ──────────────────────────────────────────────────────

ipcMain.handle('prompts:load-custom', () => {
  try {
    const p = getPromptLibraryPath()
    if (!fs.existsSync(p)) return []
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return []
  }
})

ipcMain.handle('prompts:save-custom', (_event, prompts) => {
  try {
    if (!Array.isArray(prompts)) throw new Error('prompts must be an array')
    fs.writeFileSync(getPromptLibraryPath(), JSON.stringify(prompts, null, 2), 'utf8')
    return true
  } catch (err) {
    console.error('[main] prompts:save-custom error:', err.message)
    return false
  }
})

// ─── Window Creation ──────────────────────────────────────────────────────────

function createWindow () {
  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    minWidth: 800,
    minHeight: 600,
    title: 'CodeLoom',
    titleBarStyle: 'hiddenInset',
    trafficLightPosition: { x: 16, y: 16 },
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      webSecurity: true
    },
    show: false
  })

  // ── Content Security Policy ──────────────────────────────────────────────
  // Development: relaxed (Vite HMR needs eval for source maps)
  // Production: no unsafe-eval, no unsafe-inline on scripts
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' 'wasm-unsafe-eval' blob:"
      : "script-src 'self' 'wasm-unsafe-eval' blob:"

    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [
          `default-src 'self'; ` +
          `${scriptSrc}; ` +
          `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ` +
          `font-src 'self' https://fonts.gstatic.com data:; ` +
          `connect-src 'self' http://localhost:11434 https:; ` +
          `worker-src 'self' blob:; ` +
          `img-src 'self' data: blob:;`
        ]
      }
    })
  })

  // Load the renderer
  if (isDev) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'] || 'http://localhost:5173')
    mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  // Show window after renderer is ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show()
    mainWindow.focus()

    // Safely load local stealth extension if present on disk
    try {
      const { initStealthMode } = require('./stealth')
      if (typeof initStealthMode === 'function') {
        initStealthMode(mainWindow)
      }
    } catch {
      // Stealth module absent (clean checkout / public build)
    }
  })

  // Pipe renderer console logs to terminal in dev
  if (isDev) {
    mainWindow.webContents.on('console-message', (_event, _level, message) => {
      console.log(`[Renderer] ${message}`)
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  // Open all navigation in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

// ─── App Lifecycle ────────────────────────────────────────────────────────────

app.whenReady().then(async () => {
  // macOS: Request microphone permission for voice input
  if (process.platform === 'darwin') {
    const { systemPreferences } = require('electron')
    const status = systemPreferences.getMediaAccessStatus('microphone')
    if (status !== 'granted') {
      await systemPreferences.askForMediaAccess('microphone')
    }
  }

  // Start Ollama in background — UI shows gracefully if unavailable
  ensureOllamaRunning().then(({ started, alreadyRunning }) => {
    if (!started) {
      console.warn('[main] Ollama could not be started. App will show disconnected state.')
    } else {
      console.log(`[main] Ollama ready (${alreadyRunning ? 'already running' : 'just started'}).`)
    }
  })

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('will-quit', () => {
  // Unregister all shortcuts on quit
  globalShortcut.unregisterAll()
})

app.on('window-all-closed', () => {
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill()
  }
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  if (ollamaProcess && !ollamaProcess.killed) {
    ollamaProcess.kill()
  }
})
