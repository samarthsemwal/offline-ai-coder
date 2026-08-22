/**
 * Preload Script — src/preload/index.js  (CodeLoom)
 *
 * Acts as the secure bridge between the renderer (React) and the main process (Node.js).
 * Uses Electron's `contextBridge` to expose ONLY the specific APIs the renderer needs,
 * without giving it full Node.js access (which would be a security risk).
 *
 * All storage operations, file I/O, and system calls go through here via IPC,
 * keeping `fs`, `dialog`, and `shell` usage exclusively in the main process.
 */

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {

  // ─── Platform Info ──────────────────────────────────────────────────────────
  platform: process.platform,

  // ─── Session Storage ────────────────────────────────────────────────────────

  /** List all saved sessions (metadata only, no messages) */
  listSessions: () => ipcRenderer.invoke('storage:list-sessions'),

  /** Load a full session including all messages */
  loadSession: (id) => ipcRenderer.invoke('storage:load-session', id),

  /** Save (create or update) a session */
  saveSession: (session) => ipcRenderer.invoke('storage:save-session', session),

  /** Delete a single session by id */
  deleteSession: (id) => ipcRenderer.invoke('storage:delete-session', id),

  /** Delete all sessions permanently */
  deleteAllSessions: () => ipcRenderer.invoke('storage:delete-all'),

  /** Rename a session's title */
  renameSession: (id, title) => ipcRenderer.invoke('storage:rename-session', id, title),

  /** Toggle pin state on a session */
  pinSession: (id, pinned) => ipcRenderer.invoke('storage:pin-session', id, pinned),

  /** Load full session data for export */
  exportSession: (id) => ipcRenderer.invoke('storage:export-session', id),

  // ─── Settings ───────────────────────────────────────────────────────────────

  /** Load application settings from disk */
  loadSettings: () => ipcRenderer.invoke('settings:load'),

  /** Persist application settings to disk */
  saveSettings: (settings) => ipcRenderer.invoke('settings:save', settings),

  // ─── File Import ─────────────────────────────────────────────────────────────

  /**
   * Open a native file picker dialog.
   * Returns the selected file path (string) or null if cancelled.
   * The renderer MUST then call readFile(path) to get contents.
   */
  openFileDialog: () => ipcRenderer.invoke('file:open-dialog'),

  /**
   * Safely read a file that was selected via openFileDialog.
   * Returns: { content, name, extension, sizeBytes, softLimitExceeded }
   *       or { error: string } on failure.
   * Main process validates extension, size, and path before reading.
   */
  readFile: (filePath) => ipcRenderer.invoke('file:read', filePath),

  // ─── File Export ─────────────────────────────────────────────────────────────

  /**
   * Open a native save dialog and write the given content to disk.
   * @param {{ defaultName: string, content: string }}
   * Returns: { success: boolean, filePath?: string, error?: string }
   */
  saveFileDialog: ({ defaultName, content }) =>
    ipcRenderer.invoke('file:save-dialog', { defaultName, content }),

  // ─── Shell ───────────────────────────────────────────────────────────────────

  /** Open a URL in the system default browser (http/https only) */
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),

  // ─── Ollama ──────────────────────────────────────────────────────────────────

  /** Check if Ollama is reachable (from the main process, bypassing CSP) */
  checkOllamaStatus: () => ipcRenderer.invoke('ollama:check-status'),

  // ─── Window Notifications ───────────────────────────────────────────────────

  /**
   * Register a listener for window protection toggle events from main.
   * @param {(enabled: boolean) => void} callback
   * @returns {() => void} cleanup function to remove the listener
   */
  onStealthToggle: (callback) => {
    const handler = (_event, enabled) => callback(enabled)
    ipcRenderer.on('stealth:toggle', handler)
    return () => ipcRenderer.removeListener('stealth:toggle', handler)
  },

  // ─── Prompt Library ──────────────────────────────────────────────────────────

  /** Load custom (user-saved) prompts from disk */
  loadCustomPrompts: () => ipcRenderer.invoke('prompts:load-custom'),

  /** Save the full custom prompts array to disk */
  saveCustomPrompts: (prompts) => ipcRenderer.invoke('prompts:save-custom', prompts)

})
