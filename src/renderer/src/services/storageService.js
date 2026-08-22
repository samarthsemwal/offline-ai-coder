/**
 * Storage Service — src/renderer/src/services/storageService.js
 *
 * Thin wrapper over the `window.electronAPI` IPC calls exposed by the preload script.
 * All file I/O happens in the main process; this service is the renderer's interface.
 *
 * Session schema:
 * {
 *   id: string (UUID v4),
 *   title: string (derived from first user message),
 *   createdAt: ISO string,
 *   updatedAt: ISO string,
 *   model: string,
 *   pinned: boolean,
 *   messages: Array<{ id, role, content, timestamp, responseTimeMs? }>
 * }
 */

// ─── Session CRUD ─────────────────────────────────────────────────────────────

/** Fetch all saved sessions (sorted: pinned first, then by most recent). */
export async function listSessions () {
  return window.electronAPI.listSessions()
}

/** Load a complete session by ID, including all messages. */
export async function loadSession (id) {
  return window.electronAPI.loadSession(id)
}

/** Save (create or update) a session. */
export async function saveSession (session) {
  return window.electronAPI.saveSession(session)
}

/** Permanently delete a session by ID. */
export async function deleteSession (id) {
  return window.electronAPI.deleteSession(id)
}

/** Permanently delete all saved sessions. */
export async function deleteAllSessions () {
  return window.electronAPI.deleteAllSessions()
}

/** Rename a session's display title. */
export async function renameSession (id, title) {
  return window.electronAPI.renameSession(id, title)
}

/** Toggle the pinned state of a session. */
export async function pinSession (id, pinned) {
  return window.electronAPI.pinSession(id, pinned)
}

// ─── Export ───────────────────────────────────────────────────────────────────

/**
 * Convert a session to a formatted Markdown string.
 * Used for "Export as Markdown" feature.
 *
 * @param {Object} session - Full session object with messages array
 * @returns {string} Markdown string
 */
export function sessionToMarkdown (session) {
  if (!session) return ''

  const date = session.createdAt
    ? new Date(session.createdAt).toLocaleString()
    : 'Unknown date'

  const lines = [
    `# ${session.title || 'Untitled Chat'}`,
    '',
    `**Date:** ${date}  `,
    `**Model:** ${session.model || 'Unknown'}  `,
    `**Messages:** ${session.messages?.length ?? 0}`,
    '',
    '---',
    ''
  ]

  for (const msg of (session.messages ?? [])) {
    if (msg.role === 'user') {
      lines.push('### You')
      lines.push('')
      lines.push(msg.content)
      lines.push('')
    } else if (msg.role === 'assistant') {
      lines.push('### CodeLoom')
      lines.push('')
      lines.push(msg.content)
      if (msg.responseTimeMs) {
        lines.push('')
        lines.push(`_Generated in ${(msg.responseTimeMs / 1000).toFixed(1)}s_`)
      }
      lines.push('')
    }
    lines.push('---')
    lines.push('')
  }

  return lines.join('\n')
}

/**
 * Export a session as Markdown and save via native save dialog.
 * @param {string} sessionId
 * @returns {Promise<{ success: boolean, filePath?: string, error?: string }>}
 */
export async function exportSessionAsMarkdown (sessionId) {
  const session = await window.electronAPI.exportSession(sessionId)
  if (!session) return { success: false, error: 'Session not found' }

  const content = sessionToMarkdown(session)
  const safeName = (session.title || 'codeloom-export')
    .replace(/[^a-z0-9\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
    .slice(0, 50)

  return window.electronAPI.saveFileDialog({
    defaultName: `${safeName}.md`,
    content
  })
}
