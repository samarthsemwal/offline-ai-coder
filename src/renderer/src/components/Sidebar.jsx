/**
 * Sidebar — src/renderer/src/components/Sidebar.jsx
 *
 * Collapsible panel showing saved chat sessions.
 * Features:
 * - "New Chat" button
 * - Scrollable session list (most recent first)
 * - Hover-to-reveal delete button per session
 * - "Delete All" in the footer
 */
import { useEffect, useState } from 'react'
import { listSessions } from '../services/storageService.js'
import '../styles/sidebar.css'
import '../styles/animations.css'

/**
 * Format a date into a relative or short string.
 * e.g. "Today", "Yesterday", "3 days ago", "Aug 10"
 */
function formatDate (isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} days ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

/**
 * @param {Object} props
 * @param {boolean}   props.isOpen              - Whether sidebar is visible
 * @param {string}    props.activeSessionId     - Currently loaded session ID
 * @param {Function}  props.onNewChat           - Triggered by "New Chat" button
 * @param {Function}  props.onSelectSession     - Called with full session object
 * @param {Function}  props.onDeleteSession     - Called with session id to delete
 * @param {Function}  props.onDeleteAll         - Called to delete all sessions
 * @param {number}    props.refreshKey          - Increment to force session list reload
 */
export default function Sidebar ({
  isOpen,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onDeleteAll,
  refreshKey
}) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  // Load session list from disk whenever refreshKey changes or sidebar opens
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listSessions().then(data => {
      if (!cancelled) {
        setSessions(data ?? [])
        setLoading(false)
      }
    }).catch(() => {
      if (!cancelled) setLoading(false)
    })
    return () => { cancelled = true }
  }, [refreshKey, isOpen])

  function handleDeleteClick (e, id) {
    e.stopPropagation()  // Don't trigger session selection
    onDeleteSession(id)
  }

  async function handleSelectSession (session) {
    // We only have metadata in the list — load the full session via the parent
    onSelectSession(session.id)
  }

  // Group sessions by date bucket for readability
  const today = sessions.filter(s => formatDate(s.updatedAt) === 'Today')
  const yesterday = sessions.filter(s => formatDate(s.updatedAt) === 'Yesterday')
  const older = sessions.filter(s => !['Today', 'Yesterday'].includes(formatDate(s.updatedAt)))

  function renderGroup (label, items) {
    if (items.length === 0) return null
    return (
      <>
        <div className="session-list-label">{label}</div>
        {items.map(session => (
          <div
            key={session.id}
            className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
            onClick={() => handleSelectSession(session)}
            role="button"
            tabIndex={0}
            aria-selected={session.id === activeSessionId}
            aria-label={`Load chat: ${session.title}`}
            onKeyDown={e => e.key === 'Enter' && handleSelectSession(session)}
          >
            <span className="session-item-icon" aria-hidden="true">💬</span>
            <div className="session-item-body">
              <div className="session-item-title" title={session.title}>
                {session.title || 'Untitled chat'}
              </div>
              <div className="session-item-meta">
                <span className="session-item-date">{formatDate(session.updatedAt)}</span>
                {session.model && (
                  <span className="session-item-model" title={session.model}>
                    {session.model.split(':')[0]}
                  </span>
                )}
              </div>
            </div>
            <button
              className="session-item-delete"
              onClick={e => handleDeleteClick(e, session.id)}
              title="Delete this chat"
              aria-label={`Delete chat: ${session.title}`}
            >
              🗑
            </button>
          </div>
        ))}
      </>
    )
  }

  return (
    <aside
      className={`sidebar ${isOpen ? '' : 'collapsed'}`}
      aria-label="Chat history sidebar"
      aria-hidden={!isOpen}
    >
      <div className="sidebar-header">
        <span className="sidebar-title">History</span>
      </div>

      {/* New Chat button */}
      <button
        className="btn-new-chat"
        onClick={onNewChat}
        id="new-chat-btn"
        aria-label="Start a new chat"
      >
        <span aria-hidden="true">✚</span>
        New Chat
      </button>

      {/* Session list */}
      <div className="session-list" role="list" aria-label="Saved chat sessions">
        {loading ? (
          <div className="session-list-empty">
            <span>Loading…</span>
          </div>
        ) : sessions.length === 0 ? (
          <div className="session-list-empty">
            <span aria-hidden="true">📭</span>
            <span>No saved chats yet</span>
          </div>
        ) : (
          <>
            {renderGroup('Today', today)}
            {renderGroup('Yesterday', yesterday)}
            {renderGroup('Older', older)}
          </>
        )}
      </div>

      {/* Footer */}
      {sessions.length > 0 && (
        <div className="sidebar-footer">
          <button
            className="btn-delete-all"
            onClick={onDeleteAll}
            id="delete-all-chats-btn"
            aria-label="Delete all saved chats"
          >
            <span aria-hidden="true">🗑</span>
            Delete all chats
          </button>
        </div>
      )}
    </aside>
  )
}
