/**
 * Preload Script — src/preload/index.js
 *
 * Acts as the secure bridge between the renderer (React) and the main process (Node.js).
 * Uses Electron's `contextBridge` to expose ONLY the specific APIs the renderer needs,
 * without giving it full Node.js access (which would be a security risk).
 *
 * All storage operations go through here via IPC, keeping `fs` usage in the main process.
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

  // ─── Ollama Status ──────────────────────────────────────────────────────────

  /** Check if Ollama is reachable (from the main process, bypassing CSP) */
  checkOllamaStatus: () => ipcRenderer.invoke('ollama:check-status')
})
