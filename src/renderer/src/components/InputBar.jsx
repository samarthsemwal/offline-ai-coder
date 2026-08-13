/**
 * InputBar — src/renderer/src/components/InputBar.jsx
 *
 * The fixed bottom input area:
 * - Auto-resizing textarea (field-sizing: content + JS fallback)
 * - Keyboard shortcuts: Enter to send, Shift+Enter for newline
 * - Microphone button with visual recording indicator
 * - Send button (changes to Stop while streaming)
 */
import { useRef, useEffect, useCallback } from 'react'
import { createVoiceInput } from '../services/voiceService.js'
import '../styles/input.css'
import '../styles/animations.css'

/**
 * @param {Object} props
 * @param {string}   props.value               - Current textarea value
 * @param {Function} props.onChange             - Called with new string value
 * @param {Function} props.onSend               - Send the current message
 * @param {Function} props.onStop               - Abort the current stream
 * @param {boolean}  props.isStreaming          - Is a response currently streaming?
 * @param {boolean}  props.disabled             - Fully disable input (Ollama not connected)
 * @param {boolean}  props.isRecording          - Is voice input currently active?
 * @param {Function} props.onStartRecording     - Start voice input
 * @param {Function} props.onStopRecording      - Stop voice input
 * @param {boolean}  props.voiceSupported       - Is speech recognition available?
 */
export default function InputBar ({
  value,
  onChange,
  onSend,
  onStop,
  isStreaming,
  disabled,
  isRecording,
  onStartRecording,
  onStopRecording,
  voiceSupported
}) {
  const textareaRef = useRef(null)

  // ── Auto-resize textarea ────────────────────────────────────────────────────
  // CSS `field-sizing: content` handles this natively in modern browsers.
  // This JS fallback covers older Chromium versions in older Electron.
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }, [value])

  // ── Keyboard handler ────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    // Enter sends, Shift+Enter inserts newline
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!isStreaming && value.trim() && !disabled) {
        onSend()
      }
    }
  }, [isStreaming, value, disabled, onSend])

  // ── Voice toggle ────────────────────────────────────────────────────────────
  function handleMicClick () {
    if (isRecording) {
      onStopRecording()
    } else {
      onStartRecording()
    }
  }

  const canSend = value.trim().length > 0 && !disabled

  return (
    <div className="input-bar">
      <div className={`input-bar-inner ${disabled ? 'disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          className="message-input"
          id="message-input"
          placeholder={
            disabled
              ? 'Ollama is not running…'
              : isRecording
              ? 'Listening…'
              : 'Ask anything about code or algorithms… (Enter to send)'
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
          {/* Microphone button */}
          {voiceSupported && (
            <button
              className={`btn-mic ${isRecording ? 'recording' : ''}`}
              onClick={handleMicClick}
              disabled={disabled}
              title={isRecording ? 'Stop recording' : 'Voice input'}
              aria-label={isRecording ? 'Stop voice input' : 'Start voice input'}
              aria-pressed={isRecording}
              id="mic-btn"
            >
              {isRecording ? '⏹' : '🎙'}
            </button>
          )}

          {/* Send / Stop button */}
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
        &nbsp;·&nbsp; <kbd>⌘N</kbd> for new chat
      </p>
    </div>
  )
}
