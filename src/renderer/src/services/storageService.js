/**
 * Storage Service — src/renderer/src/services/storageService.js
 *
 * Thin wrapper over the `window.electronAPI` IPC calls exposed by the preload script.
 * All file I/O happens in the main process; this service is the renderer's interface.
 *
 * Session schema:
 * {
 *   id: string (UUID),
 *   title: string (derived from first user message),
 *   createdAt: ISO string,
 *   updatedAt: ISO string,
 *   model: string,
 *   messages: Array<{ id, role, content, timestamp }>
 * }
 */

/**
 * Fetch all saved sessions (sorted by most recent first).
 * Returns metadata only — no messages array — for efficient sidebar rendering.
 * @returns {Promise<Array>}
 */
export async function listSessions () {
  return window.electronAPI.listSessions()
}

/**
 * Load a complete session by ID, including all messages.
 * @param {string} id
 * @returns {Promise<Object|null>}
 */
export async function loadSession (id) {
  return window.electronAPI.loadSession(id)
}

/**
 * Save (create or update) a session.
 * The session object must include an `id` field (UUID).
 * @param {Object} session
 * @returns {Promise<boolean>}
 */
export async function saveSession (session) {
  return window.electronAPI.saveSession(session)
}

/**
 * Permanently delete a session by ID.
 * @param {string} id
 * @returns {Promise<boolean>}
 */
export async function deleteSession (id) {
  return window.electronAPI.deleteSession(id)
}

/**
 * Permanently delete all saved sessions.
 * @returns {Promise<boolean>}
 */
export async function deleteAllSessions () {
  return window.electronAPI.deleteAllSessions()
}
