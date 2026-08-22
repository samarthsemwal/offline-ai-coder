/**
 * App.jsx — Root component for CodeLoom
 *
 * Orchestrates all state and child components:
 * - Ollama connection + model list (via useOllama)
 * - Chat session (via useChat)
 * - Application settings (via useSettings)
 * - Voice input (via voiceService)
 * - Sidebar visibility and session management
 * - Keyboard shortcuts
 * - Toast notifications (system alerts via IPC)
 * - Settings panel, Prompt Library, Onboarding
 */
import { useState, useCallback, useEffect, useRef } from 'react'
import { useOllama } from './hooks/useOllama.js'
import { useChat } from './hooks/useChat.js'
import { useSettings } from './hooks/useSettings.js'
import { createVoiceInput } from './services/voiceService.js'
import { loadSession, deleteSession, deleteAllSessions } from './services/storageService.js'

import Header from './components/Header.jsx'
import Sidebar from './components/Sidebar.jsx'
import ChatPanel from './components/ChatPanel.jsx'
import InputBar from './components/InputBar.jsx'
import AddModelModal from './components/AddModelModal.jsx'
import ConfirmModal from './components/ConfirmModal.jsx'
import Settings from './components/Settings.jsx'
import PromptLibrary from './components/PromptLibrary.jsx'
import Onboarding from './components/Onboarding.jsx'
import Toast from './components/Toast.jsx'

import './styles/index.css'
import './styles/animations.css'

export default function App () {
  // ── Settings ──────────────────────────────────────────────────────────────────
  const { settings, updateSetting, updateSettings, isLoaded: settingsLoaded } = useSettings()

  // ── Layout State ──────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [showSettings, setShowSettings] = useState(false)
  const [showPromptLibrary, setShowPromptLibrary] = useState(false)

  // ── Modal State ────────────────────────────────────────────────────────────────
  const [showAddModel, setShowAddModel] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)

  // ── Input State ────────────────────────────────────────────────────────────────
  const [inputValue, setInputValue] = useState('')
  const [attachedFile, setAttachedFile] = useState(null) // { name, content, language, estimatedTokens, wasTruncated }
  const inputRef = useRef(null)

  // ── Voice Input State ──────────────────────────────────────────────────────────
  const [isRecording, setIsRecording] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState('idle') // 'idle'|'recording'|'processing'|'ready'|'error'
  const [voiceSupported, setVoiceSupported] = useState(false)
  const [voiceModelStatus, setVoiceModelStatus] = useState(null)
  const voiceInputRef = useRef(null)

  // ── Toast ──────────────────────────────────────────────────────────────────────
  const [toast, setToast] = useState(null)

  // ── Sidebar refresh ────────────────────────────────────────────────────────────
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)
  const refreshSidebar = useCallback(() => setSidebarRefreshKey(k => k + 1), [])

  // ── Ollama ─────────────────────────────────────────────────────────────────────
  const {
    connected,
    models,
    selectedModel,
    setSelectedModel,
    refreshModels,
    isLoading: ollamaLoading
  } = useOllama()

  // ── Chat ───────────────────────────────────────────────────────────────────────
  const {
    messages,
    isStreaming,
    streamingContent,
    currentSession,
    sendMessage,
    newChat,
    loadSessionData,
    abortStream,
    regenerateMessage,
    retryLastMessage,
    deleteMessage,
    errorMessage,
    clearError
  } = useChat({
    selectedModel,
    onSessionSaved: () => refreshSidebar(),
    temperature: settings.temperature,
    systemPrompt: settings.systemPrompt
  })

  // ── Voice Input Setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const voice = createVoiceInput({
      onResult: (transcript) => {
        // Put transcription into textarea — do NOT auto-send
        setInputValue(transcript)
        setVoiceStatus('ready')
        setIsRecording(false)
      },
      onStart: () => { setIsRecording(true); setVoiceStatus('recording') },
      onStop: () => { setVoiceStatus('processing') },
      onError: (msg) => {
        setIsRecording(false)
        setVoiceStatus('error')
        console.warn('[voice]', msg)
      },
      onModelStatus: (status) => setVoiceModelStatus(status)
    })
    voiceInputRef.current = voice
    const supported = voice.isSupported()
    setVoiceSupported(supported)
    if (supported) voice.preloadModel()
  }, [])

  // ── Stealth Mode IPC Listener ──────────────────────────────────────────────────
  useEffect(() => {
    if (!window.electronAPI?.onStealthToggle) return
    const cleanup = window.electronAPI.onStealthToggle((enabled) => {
      setToast({
        message: `Stealth Mode: ${enabled ? 'ON' : 'OFF'}`,
        type: enabled ? 'info' : 'warning'
      })
    })
    return cleanup
  }, [])

  // ── Sync sidebar open state from settings ─────────────────────────────────────
  useEffect(() => {
    if (settingsLoaded) setSidebarOpen(settings.sidebarOpen)
  }, [settingsLoaded]) // only on initial load

  // ── Keyboard Shortcuts ─────────────────────────────────────────────────────────
  useEffect(() => {
    function handleKeydown (e) {
      const meta = e.metaKey || e.ctrlKey

      if (meta && e.key === 'n') { e.preventDefault(); handleNewChat() }
      if (meta && e.key === 'b') { e.preventDefault(); setSidebarOpen(o => !o) }
      if (meta && e.key === ',') { e.preventDefault(); setShowSettings(s => !s) }
      if (meta && e.key === '/') { e.preventDefault(); inputRef.current?.focus() }
      if (meta && e.key === 'f') { e.preventDefault(); document.getElementById('sidebar-search')?.focus() }
      if (meta && e.altKey && e.key === 'p') { e.preventDefault(); setShowPromptLibrary(s => !s) }
      if (meta && e.altKey && e.key === 'v') {
        e.preventDefault()
        if (isRecording) voiceInputRef.current?.stop()
        else voiceInputRef.current?.start()
      }
      if (meta && e.key === 'k' && messages.length > 0) {
        e.preventDefault()
        setConfirmDelete({ type: 'clear' })
      }
      if (e.key === 'Escape') {
        if (showSettings) setShowSettings(false)
        else if (showPromptLibrary) setShowPromptLibrary(false)
        else if (showAddModel) setShowAddModel(false)
        else if (confirmDelete) setConfirmDelete(null)
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  }, [showSettings, showPromptLibrary, showAddModel, confirmDelete, isRecording, messages.length])

  // ── Handlers ───────────────────────────────────────────────────────────────────

  function handleNewChat () {
    newChat()
    setInputValue('')
    setAttachedFile(null)
  }

  function handleSend (overrideText) {
    const text = overrideText ?? inputValue
    if (!text.trim() || isStreaming) return

    let finalContent = text.trim()

    // Append file context if attached
    if (attachedFile) {
      finalContent = `${finalContent}\n\n**Attached file: ${attachedFile.name}** (${attachedFile.language})\n\n\`\`\`${attachedFile.language}\n${attachedFile.content}\n\`\`\``
      if (attachedFile.wasTruncated) {
        finalContent += `\n\n> ⚠️ Note: File was truncated to fit context budget.`
      }
    }

    sendMessage(finalContent)
    setInputValue('')
    setAttachedFile(null)
  }

  function handlePromptSelect (prompt) {
    setInputValue(prompt)
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  async function handleSelectSession (id) {
    const session = await loadSession(id)
    if (session) loadSessionData(session)
  }

  function handleDeleteSession (id) {
    setConfirmDelete({ type: 'single', id })
  }

  async function confirmDeleteAction () {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)

    if (type === 'all') {
      await deleteAllSessions()
      handleNewChat()
    } else if (type === 'single') {
      await deleteSession(id)
      if (currentSession?.id === id) handleNewChat()
    } else if (type === 'clear') {
      handleNewChat()
    }
    refreshSidebar()
  }

  function handleDeleteAll () { setConfirmDelete({ type: 'all' }) }

  function handleStartRecording () { voiceInputRef.current?.start() }
  function handleStopRecording () { voiceInputRef.current?.stop() }

  function handleAddModelSuccess () {
    refreshModels()
    setShowAddModel(false)
  }

  function handleSidebarToggle () {
    setSidebarOpen(o => {
      updateSetting('sidebarOpen', !o)
      return !o
    })
  }

  // ── Onboarding ──────────────────────────────────────────────────────────────────
  const showOnboarding = settingsLoaded && !settings.firstRunComplete

  function handleOnboardingComplete (defaultModel) {
    if (defaultModel) setSelectedModel(defaultModel)
    updateSetting('firstRunComplete', true)
  }

  // Don't render until settings are loaded (prevents flash of wrong state)
  if (!settingsLoaded) return null

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div className="app-layout">
      {/* Onboarding (first-run only) */}
      {showOnboarding && (
        <Onboarding
          connected={connected}
          models={models}
          onComplete={handleOnboardingComplete}
          onSkip={() => updateSetting('firstRunComplete', true)}
        />
      )}

      {/* Toast notification (IPC-driven, replaces executeJavaScript) */}
      <Toast toast={toast} onDismiss={() => setToast(null)} />

      {/* Settings panel */}
      {showSettings && (
        <Settings
          settings={settings}
          onUpdateSetting={updateSetting}
          onUpdateSettings={updateSettings}
          onClose={() => setShowSettings(false)}
          connected={connected}
          models={models}
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
        />
      )}

      {/* Prompt Library panel */}
      {showPromptLibrary && (
        <PromptLibrary
          onClose={() => setShowPromptLibrary(false)}
          onSelectPrompt={(template) => {
            setInputValue(template)
            setShowPromptLibrary(false)
            setTimeout(() => inputRef.current?.focus(), 50)
          }}
        />
      )}

      {/* Top header */}
      <Header
        sidebarOpen={sidebarOpen}
        onToggleSidebar={handleSidebarToggle}
        connected={connected}
        isLoading={ollamaLoading}
        models={models}
        selectedModel={selectedModel}
        onModelChange={setSelectedModel}
        onAddModelClick={() => setShowAddModel(true)}
        onSettingsClick={() => setShowSettings(true)}
        onPromptLibraryClick={() => setShowPromptLibrary(true)}
      />

      {/* Error banner */}
      {errorMessage && (
        <div className="error-banner" role="alert">
          <span>⚠️ {errorMessage}</span>
          <div className="error-banner-actions">
            {messages.length > 0 && !isStreaming && (
              <button className="btn-retry-error" onClick={retryLastMessage}>
                ↻ Retry
              </button>
            )}
            <button onClick={clearError} aria-label="Dismiss error">×</button>
          </div>
        </div>
      )}

      {/* Voice model status banner */}
      {voiceModelStatus && voiceModelStatus.status !== 'ready' && (
        <div className="voice-status-banner" role="status">
          {voiceModelStatus.status === 'downloading'
            ? <span>🎙️ Downloading Whisper voice model… {voiceModelStatus.progress ?? 0}%
                <small> (one-time download, ~42 MB — needed for offline voice recognition)</small>
              </span>
            : voiceModelStatus.status === 'error'
              ? <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span>⚠️ Voice model error: {voiceModelStatus.message || 'Failed to load'}</span>
                  <button 
                    onClick={() => setVoiceModelStatus(null)} 
                    style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '16px', padding: '0 8px' }}
                    aria-label="Dismiss voice error"
                  >×</button>
                </div>
              : <span>🎙️ Loading voice model…</span>
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
          onPromptLibraryClick={() => setShowPromptLibrary(true)}
        />

        <div className="main-panel">
          <ChatPanel
            messages={messages}
            isStreaming={isStreaming}
            streamingContent={streamingContent}
            onPromptSelect={handlePromptSelect}
            onRegenerate={regenerateMessage}
            onDeleteMessage={deleteMessage}
            onRetry={retryLastMessage}
            errorMessage={errorMessage}
          />

          <InputBar
            inputRef={inputRef}
            value={inputValue}
            onChange={setInputValue}
            onSend={handleSend}
            onStop={abortStream}
            isStreaming={isStreaming}
            disabled={!connected}
            isRecording={isRecording}
            voiceStatus={voiceStatus}
            onStartRecording={handleStartRecording}
            onStopRecording={handleStopRecording}
            voiceSupported={voiceSupported && settings.voiceEnabled}
            attachedFile={attachedFile}
            onAttachFile={setAttachedFile}
            onRemoveFile={() => setAttachedFile(null)}
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

      {/* Confirm Modal */}
      {confirmDelete && (
        <ConfirmModal
          title={
            confirmDelete.type === 'all' ? 'Delete all chats?' :
            confirmDelete.type === 'clear' ? 'Clear current chat?' :
            'Delete this chat?'
          }
          message={
            confirmDelete.type === 'all'
              ? 'This will permanently delete all saved chat sessions. This cannot be undone.'
              : confirmDelete.type === 'clear'
              ? 'This will clear the current conversation. It will not be saved.'
              : 'This will permanently delete this chat session. This cannot be undone.'
          }
          confirmText={confirmDelete.type === 'all' ? 'Delete All' : confirmDelete.type === 'clear' ? 'Clear' : 'Delete'}
          onConfirm={confirmDeleteAction}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  )
}
