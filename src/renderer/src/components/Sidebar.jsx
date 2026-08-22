/**
 * Sidebar — src/renderer/src/components/Sidebar.jsx  (CodeLoom)
 *
 * Features: search (debounced), pin groups, inline rename,
 * context menu (rename/pin/export/delete), message count badge.
 */
import { useEffect, useState, useRef, useCallback } from 'react'
import { listSessions, renameSession, pinSession, exportSessionAsMarkdown } from '../services/storageService.js'
import '../styles/sidebar.css'
import '../styles/animations.css'

function formatDate (isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24))
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays}d ago`
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export default function Sidebar ({
  isOpen,
  activeSessionId,
  onNewChat,
  onSelectSession,
  onDeleteSession,
  onDeleteAll,
  refreshKey,
  onPromptLibraryClick
}) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [renamingId, setRenamingId] = useState(null)
  const [renameValue, setRenameValue] = useState('')
  const [contextMenu, setContextMenu] = useState(null) // { sessionId, x, y }
  const searchDebounceRef = useRef(null)
  const renameInputRef = useRef(null)

  // Load sessions
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    listSessions().then(data => {
      if (!cancelled) { setSessions(data ?? []); setLoading(false) }
    }).catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [refreshKey, isOpen])

  // Focus rename input when opened
  useEffect(() => {
    if (renamingId) setTimeout(() => renameInputRef.current?.focus(), 50)
  }, [renamingId])

  // Close context menu on outside click
  useEffect(() => {
    function handleClick () { setContextMenu(null) }
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  // Debounced search
  const handleSearchChange = useCallback((val) => {
    clearTimeout(searchDebounceRef.current)
    searchDebounceRef.current = setTimeout(() => setSearchQuery(val), 300)
  }, [])

  // Filter + group
  const filtered = searchQuery
    ? sessions.filter(s => s.title?.toLowerCase().includes(searchQuery.toLowerCase()))
    : sessions

  const pinned = filtered.filter(s => s.pinned)
  const unpinned = filtered.filter(s => !s.pinned)
  const today = unpinned.filter(s => formatDate(s.updatedAt) === 'Today')
  const yesterday = unpinned.filter(s => formatDate(s.updatedAt) === 'Yesterday')
  const older = unpinned.filter(s => !['Today', 'Yesterday'].includes(formatDate(s.updatedAt)))

  // ── Handlers ──────────────────────────────────────────────────────────────────

  function handleContextMenu (e, session) {
    e.preventDefault()
    e.stopPropagation()
    setContextMenu({ session, x: e.clientX, y: e.clientY })
  }

  function startRename (session) {
    setRenamingId(session.id)
    setRenameValue(session.title || '')
    setContextMenu(null)
  }

  async function commitRename (sessionId) {
    if (!renameValue.trim()) { setRenamingId(null); return }
    await renameSession(sessionId, renameValue.trim())
    setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: renameValue.trim() } : s))
    setRenamingId(null)
  }

  async function handlePin (session) {
    const newPinned = !session.pinned
    await pinSession(session.id, newPinned)
    setSessions(prev => prev.map(s =>
      s.id === session.id ? { ...s, pinned: newPinned } : s
    ).sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return new Date(b.updatedAt) - new Date(a.updatedAt)
    }))
    setContextMenu(null)
  }

  async function handleExport (session) {
    setContextMenu(null)
    await exportSessionAsMarkdown(session.id)
  }

  // ── Session Item ──────────────────────────────────────────────────────────────

  function renderSession (session) {
    const isActive = session.id === activeSessionId
    const isRenaming = renamingId === session.id

    return (
      <div
        key={session.id}
        className={`session-item ${isActive ? 'active' : ''} ${session.pinned ? 'pinned' : ''}`}
        onClick={() => !isRenaming && onSelectSession(session.id)}
        onContextMenu={(e) => handleContextMenu(e, session)}
        role="button"
        tabIndex={0}
        aria-selected={isActive}
        aria-label={`Load chat: ${session.title}`}
        onKeyDown={e => e.key === 'Enter' && !isRenaming && onSelectSession(session.id)}
      >
        <span className="session-item-icon" aria-hidden="true">
          {session.pinned ? '📌' : '💬'}
        </span>

        <div className="session-item-body">
          {isRenaming ? (
            <input
              ref={renameInputRef}
              className="session-rename-input"
              value={renameValue}
              onChange={e => setRenameValue(e.target.value)}
              onBlur={() => commitRename(session.id)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename(session.id)
                if (e.key === 'Escape') setRenamingId(null)
              }}
              onClick={e => e.stopPropagation()}
              aria-label="Rename chat"
            />
          ) : (
            <div
              className="session-item-title"
              title={session.title}
              onDoubleClick={(e) => { e.stopPropagation(); startRename(session) }}
            >
              {session.title || 'Untitled chat'}
            </div>
          )}

          <div className="session-item-meta">
            <span className="session-item-date">{formatDate(session.updatedAt)}</span>
            {session.messageCount > 0 && (
              <span className="session-msg-count">{session.messageCount}</span>
            )}
          </div>
        </div>

        <button
          className="session-item-delete"
          onClick={e => { e.stopPropagation(); onDeleteSession(session.id) }}
          title="Delete chat"
          aria-label={`Delete chat: ${session.title}`}
        >
          🗑
        </button>
      </div>
    )
  }

  function renderGroup (label, items) {
    if (items.length === 0) return null
    return (
      <>
        <div className="session-list-label">{label}</div>
        {items.map(renderSession)}
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
        aria-label="Start a new chat (⌘N)"
        title="New chat (⌘N)"
      >
        <span aria-hidden="true">✚</span> New Chat
      </button>

      {/* Search */}
      <div className="sidebar-search-wrapper">
        <span className="sidebar-search-icon" aria-hidden="true">🔍</span>
        <input
          id="sidebar-search"
          className="sidebar-search"
          type="text"
          placeholder="Search chats…"
          onChange={e => handleSearchChange(e.target.value)}
          aria-label="Search conversations"
        />
      </div>

      {/* Session list */}
      <div className="session-list" role="list" aria-label="Saved chat sessions">
        {loading ? (
          <div className="session-list-empty"><span>Loading…</span></div>
        ) : filtered.length === 0 ? (
          <div className="session-list-empty">
            <span aria-hidden="true">📭</span>
            <span>{searchQuery ? 'No matching chats' : 'No saved chats yet'}</span>
          </div>
        ) : (
          <>
            {renderGroup('📌 Pinned', pinned)}
            {renderGroup('Today', today)}
            {renderGroup('Yesterday', yesterday)}
            {renderGroup('Older', older)}
          </>
        )}
      </div>

      {/* Footer */}
      <div className="sidebar-footer">
        <button
          className="btn-icon-sm sidebar-footer-btn"
          onClick={onPromptLibraryClick}
          title="Prompt Library (⌘⌥P)"
          aria-label="Open prompt library"
        >
          📚 Prompts
        </button>

        {sessions.length > 0 && (
          <button
            className="btn-delete-all"
            onClick={onDeleteAll}
            id="delete-all-chats-btn"
            aria-label="Delete all saved chats"
          >
            <span aria-hidden="true">🗑</span> Delete all
          </button>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="session-context-menu"
          style={{ top: contextMenu.y, left: Math.min(contextMenu.x, window.innerWidth - 180) }}
          onClick={e => e.stopPropagation()}
          role="menu"
        >
          <button role="menuitem" onClick={() => startRename(contextMenu.session)}>✏️ Rename</button>
          <button role="menuitem" onClick={() => handlePin(contextMenu.session)}>
            {contextMenu.session.pinned ? '📌 Unpin' : '📌 Pin'}
          </button>
          <button role="menuitem" onClick={() => handleExport(contextMenu.session)}>⬇️ Export as Markdown</button>
          <div className="context-menu-divider" />
          <button role="menuitem" className="danger" onClick={() => { onDeleteSession(contextMenu.session.id); setContextMenu(null) }}>
            🗑 Delete
          </button>
        </div>
      )}
    </aside>
  )
}
