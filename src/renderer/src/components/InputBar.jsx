/**
 * InputBar — src/renderer/src/components/InputBar.jsx  (CodeLoom)
 *
 * Bottom input area with:
 * - Auto-resizing textarea
 * - Voice input with waveform animation + duration counter
 * - File attachment button + badge with token estimate
 * - Coding Actions toolbar toggle
 * - Send / Stop button
 */
import { useRef, useEffect, useCallback, useState } from 'react'
import CodingActions from './CodingActions.jsx'
import { detectLanguage, getLanguageDisplayName } from '../services/languageDetector.js'
import { buildFileContext, formatTokenCount } from '../services/contextBuilder.js'
import '../styles/input.css'
import '../styles/animations.css'

export default function InputBar ({
  inputRef,
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  isRecording,
  voiceStatus,
  onStartRecording,
  onStopRecording,
  voiceSupported,
  attachedFile,
  onAttachFile,
  onRemoveFile
}) {
  const textareaRef = inputRef || useRef(null)
  const [showCodingActions, setShowCodingActions] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const recordingTimerRef = useRef(null)

  // ── Auto-resize textarea ──────────────────────────────────────────────────────
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  // ── Recording timer ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (isRecording) {
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(s => s + 1)
      }, 1000)
    } else {
      clearInterval(recordingTimerRef.current)
      setRecordingSeconds(0)
    }
    return () => clearInterval(recordingTimerRef.current)
  }, [isRecording])

  // ── Keyboard handler ──────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && value.trim() && !disabled) onSend()
    }
  }, [isStreaming, value, disabled, onSend])

  // ── File attachment ───────────────────────────────────────────────────────────
  async function handleFileAttach () {
    try {
      const filePath = await window.electronAPI.openFileDialog()
      if (!filePath) return

      const result = await window.electronAPI.readFile(filePath)
      if (result?.error) {
        console.warn('[InputBar] File read error:', result.error)
        return
      }

      const language = detectLanguage(result.name, result.content)
      const context = buildFileContext({
        content: result.content,
        fileName: result.name,
        language
      })

      onAttachFile({
        name: result.name,
        content: context.content,
        language,
        languageDisplay: getLanguageDisplayName(language),
        wasTruncated: context.wasTruncated,
        estimatedTokens: context.estimatedTokens,
        originalTokens: context.originalTokens,
        originalLines: context.originalLines,
        includedLines: context.includedLines
      })
    } catch (err) {
      console.error('[InputBar] File attach error:', err)
    }
  }

  // ── Drag and drop ─────────────────────────────────────────────────────────────
  function handleDragOver (e) { e.preventDefault() }
  async function handleDrop (e) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (!file) return
    // Can't read from dropped file path directly due to security — use dialog instead
    // For Electron we can use file.path which is available in the renderer
    if (file.path) {
      const result = await window.electronAPI.readFile(file.path)
      if (result?.error || !result?.content) return
      const language = detectLanguage(result.name || file.name, result.content)
      const context = buildFileContext({ content: result.content, fileName: file.name, language })
      onAttachFile({
        name: file.name, content: context.content, language,
        languageDisplay: getLanguageDisplayName(language),
        wasTruncated: context.wasTruncated,
        estimatedTokens: context.estimatedTokens,
        originalTokens: context.originalTokens,
        originalLines: context.originalLines,
        includedLines: context.includedLines
      })
    }
  }

  // ── Voice toggle ──────────────────────────────────────────────────────────────
  function handleMicClick () {
    if (isRecording) onStopRecording()
    else onStartRecording()
  }

  function formatDuration (s) {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="input-bar">
      {/* Coding Actions toolbar (collapsible) */}
      {showCodingActions && (
        <CodingActions
          onAction={(prompt) => {
            onChange(prompt)
            setTimeout(() => textareaRef.current?.focus(), 50)
          }}
          currentInput={value}
          attachedFile={attachedFile}
        />
      )}

      {/* Attached file badge */}
      {attachedFile && (
        <div className="file-attachment-badge">
          <span className="file-badge-icon">📎</span>
          <span className="file-badge-name">{attachedFile.name}</span>
          <span className="file-badge-lang">{attachedFile.languageDisplay}</span>
          <span className="file-badge-tokens">{formatTokenCount(attachedFile.estimatedTokens)}</span>
          {attachedFile.wasTruncated && (
            <span className="file-badge-truncated" title={`File truncated: showing ${attachedFile.includedLines} of ${attachedFile.originalLines} lines`}>
              ⚠️ Truncated
            </span>
          )}
          <button
            className="file-badge-remove"
            onClick={onRemoveFile}
            aria-label="Remove attached file"
            title="Remove file"
          >
            ×
          </button>
        </div>
      )}

      <div
        className={`input-bar-inner ${disabled ? 'disabled' : ''}`}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <textarea
          ref={textareaRef}
          className="message-input"
          id="message-input"
          placeholder={
            disabled ? 'Ollama is not running…' :
            isRecording ? 'Listening…' :
            voiceStatus === 'processing' ? 'Transcribing…' :
            attachedFile ? `Ask about ${attachedFile.name}… (Enter to send)` :
            'Ask anything about code… (Enter to send, drag & drop a file)'
          }
          value={value}
          onChange={e => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={1}
          aria-label="Message input"
          aria-multiline="true"
          autoFocus
        />

        <div className="input-actions">
          {/* Coding actions toggle */}
          <button
            className={`btn-icon-action ${showCodingActions ? 'active' : ''}`}
            onClick={() => setShowCodingActions(s => !s)}
            disabled={disabled}
            title="Coding actions (⌘⌥C)"
            aria-label="Toggle coding actions"
            aria-pressed={showCodingActions}
          >
            ⚡
          </button>

          {/* File attach */}
          <button
            className="btn-icon-action"
            onClick={handleFileAttach}
            disabled={disabled}
            title="Attach code file"
            aria-label="Attach a code file"
            id="file-attach-btn"
          >
            📎
          </button>

          {/* Microphone */}
          {voiceSupported && (
            <button
              className={`btn-mic ${isRecording ? 'recording' : ''} ${voiceStatus === 'processing' ? 'processing' : ''}`}
              onClick={handleMicClick}
              disabled={disabled || voiceStatus === 'processing'}
              title={isRecording ? `Stop recording (${formatDuration(recordingSeconds)})` : 'Voice input (⌘⌥V)'}
              aria-label={isRecording ? 'Stop voice recording' : 'Start voice input'}
              aria-pressed={isRecording}
              id="mic-btn"
            >
              {isRecording ? (
                <span className="recording-indicator">
                  <span className="recording-dot" />
                  {formatDuration(recordingSeconds)}
                </span>
              ) : voiceStatus === 'processing' ? (
                <span className="processing-indicator">⟳</span>
              ) : '🎙'}

              {/* Waveform bars (shown while recording) */}
              {isRecording && (
                <span className="waveform" aria-hidden="true">
                  <span /><span /><span /><span /><span />
                </span>
              )}
            </button>
          )}

          {/* Send / Stop */}
          <button
            className={`btn-send ${isStreaming ? 'streaming' : ''}`}
            onClick={isStreaming ? onStop : onSend}
            disabled={!isStreaming && !canSend}
            title={isStreaming ? 'Stop generating' : 'Send message (Enter)'}
            aria-label={isStreaming ? 'Stop generating response' : 'Send message'}
            id="send-btn"
          >
            {isStreaming ? '⏹' : '▶'}
          </button>
        </div>
      </div>

      <p className="input-hint">
        <kbd>Enter</kbd> to send &nbsp;·&nbsp; <kbd>Shift</kbd>+<kbd>Enter</kbd> for new line
        &nbsp;·&nbsp; <kbd>⌘N</kbd> new chat &nbsp;·&nbsp; <kbd>⌘⌥V</kbd> voice
        &nbsp;·&nbsp; Drag &amp; drop a file to attach
      </p>
    </div>
  )
}
