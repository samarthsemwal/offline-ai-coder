/**
 * App.jsx — Root component for Offline Coder Chat
 *
 * Orchestrates all state and child components:
 * - Ollama connection + model list (via useOllama)
 * - Chat session (via useChat)
 * - Voice input (via voiceService)
 * - Sidebar visibility and session management
 * - Keyboard shortcuts (Cmd+N for new chat)
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useOllama } from './hooks/useOllama.js'
import { useChat } from './hooks/useChat.js'
import { createVoiceInput } from './services/voiceService.js'
import { loadSession, deleteSession, deleteAllSessions } from './services/storageService.js'

import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import InputBar from './components/InputBar.jsx'
import AddModelModal from './components/AddModelModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'

import './styles/index.css'
import './styles/animations.css'

export default function App () {
  // ── Layout State ────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)

  // ── Modal State ──────────────────────────────────────────────────────────────
  const [showAddModel, setShowAddModel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // { id, title } or 'all'

  // ── Input State ──────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('')

  // ── Voice Input State ────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceModelStatus, setVoiceModelStatus] = useState(null) // null | { status, progress }
  const voiceInputRef = useRef(null)

  // ── Session Refresh Key ──────────────────────────────────────────────────────
  // Incrementing this key tells the Sidebar to re-fetch the session list from disk
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const refreshSidebar = useCallback(() => setSidebarRefreshKey(k => k + 1), [])

  // ── Ollama ───────────────────────────────────────────────────────────────────
  const {
    connected,
    models,
    selectedModel,
    setSelectedModel,
    refreshModels,
    isLoading: ollamaLoading
  } = useOllama()

  // ── Chat ─────────────────────────────────────────────────────────────────────
  const {
    messages,
    isStreaming,
    streamingContent,
    currentSession,
    sendMessage,
    newChat,
    loadSessionData,
    abortStream,
    errorMessage,
    clearError
  } = useChat({
    selectedModel,
    onSessionSaved: () => refreshSidebar()
  })

  // ── Voice Input Setup ────────────────────────────────────────────────────────
  useEffect(() => {
    const voice = createVoiceInput({
      onResult: (transcript, isFinal) => {
        setInputValue(transcript)
        if (isFinal) setIsRecording(false)
      },
      onStart: () => setIsRecording(true),
      onStop: () => setIsRecording(false),
      onError: (msg) => {
        setIsRecording(false)
        console.warn('[voice]', msg)
      },
      onModelStatus: (status) => setVoiceModelStatus(status)
    })
    voiceInputRef.current = voice
    const supported = voice.isSupported()
    setVoiceSupported(supported)
    // Preload Whisper model in background so first use is instant
    if (supported) voice.preloadModel()
  }, [])

  // ── Keyboard Shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeydown (e) {
      // Cmd+N (macOS) / Ctrl+N: New Chat
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault()
        handleNewChat()
      }
      // Escape: Close open modals
      if (e.key === 'Escape') {
        if (showAddModel) setShowAddModel(false)
        if (confirmDelete) setConfirmDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [showAddModel, confirmDelete])

  // ── Handlers ─────────────────────────────────────────────────────────────────

  function handleNewChat () {
    newChat()
    setInputValue('')
  }

  function handleSend () {
    if (!inputValue.trim() || isStreaming) return
    sendMessage(inputValue)
    setInputValue('')
  }

  function handlePromptSelect (prompt) {
    setInputValue(prompt)
    // Small delay to let the textarea update before auto-sending
    setTimeout(() => {
      sendMessage(prompt)
      setInputValue('')
    }, 50)
  }

  async function handleSelectSession (id) {
    const session = await loadSession(id)
    if (session) loadSessionData(session)
  }

  // Delete single session — show confirmation first
  function handleDeleteSession (id) {
    const session = messages.find ? null : null
    setConfirmDelete({ type: 'single', id })
  }

  async function confirmDeleteSession () {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)

    if (type === 'all') {
      await deleteAllSessions()
      handleNewChat()
    } else {
      await deleteSession(id)
      // If we just deleted the active session, start a new chat
      if (currentSession?.id === id) handleNewChat()
    }
    refreshSidebar()
  }

  function handleDeleteAll () {
    setConfirmDelete({ type: 'all' })
  }

  function handleStartRecording () {
    voiceInputRef.current?.start()
  }

  function handleStopRecording () {
    voiceInputRef.current?.stop()
  }

  function handleAddModelSuccess () {
    refreshModels()
    refreshSidebar()
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      {/* Top header */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={() => setSidebarOpen(o => !o)}
        connected={connected}
        isLoading={ollamaLoading}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAddModelClick={() => setShowAddModel(true)}
      />

      {/* Error banner */}
      {errorMessage && (
        <div className="error-banner" role="alert">
          <span>⚠️ {errorMessage}</span>
          <button onClick={clearError} aria-label="Dismiss error">×</button>
        </div>
      )}

      {/* Voice model status banner */}
      {voiceModelStatus && voiceModelStatus.status !== 'ready' && (
        <div className="error-banner" role="status" style={{ background: 'rgba(99,102,241,0.15)', borderColor: 'rgba(99,102,241,0.4)', color: '#a5b4fc' }}>
          {voiceModelStatus.status === 'downloading'
            ? <span>🎙️ Downloading voice model… {voiceModelStatus.progress ?? 0}% (one-time, ~42 MB)</span>
            : voiceModelStatus.status === 'error'
              ? <span>⚠️ Voice model failed to load. Check console or try again. {voiceModelStatus.message || ''}</span>
              : <span>🎙️ Loading voice model… (Setting up AI engine)</span>
          }
        </div>
      )}

      {/* Main content */}
      <div className="app-body">
        <Sidebar
          isOpen={sidebarOpen}
          activeSessionId={currentSession?.id}
          onNewChat={handleNewChat}
          onSelectSession={handleSelectSession}
          onDeleteSession={handleDeleteSession}
          onDeleteAll={handleDeleteAll}
          refreshKey={sidebarRefreshKey}
        />

        <div className="main-panel">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onPromptSelect={handlePromptSelect}
          />

          <InputBar
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onStop={abortStream}
            isStreaming={isStreaming}
            disabled={!connected}
            isRecording={isRecording}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            voiceSupported={voiceSupported}
          />
        </div>
      </div>

      {/* Add Model Modal */}
      {showAddModel && (
        <AddModelModal
          onClose={() => setShowAddModel(false)}
          onSuccess={handleAddModelSuccess}
        />
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <ConfirmModal
          title={confirmDelete.type === 'all' ? 'Delete all chats?' : 'Delete this chat?'}
          message={
            confirmDelete.type === 'all'
              ? 'This will permanently delete all saved chat sessions. This action cannot be undone.'
              : 'This will permanently delete this chat session. This action cannot be undone.'
          }
          confirmText={confirmDelete.type === 'all' ? 'Delete All' : 'Delete'}
          onConfirm={confirmDeleteSession}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
