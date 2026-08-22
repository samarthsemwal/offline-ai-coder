/**
 * MessageBubble — src/renderer/src/components/MessageBubble.jsx  (CodeLoom)
 *
 * Renders one chat message with hover action bar: copy, regenerate, delete.
 * Actions are disabled during streaming.
 */
import { useState, memo } from 'react'
import MarkdownRenderer from './MarkdownRenderer.jsx'
import '../styles/chat.css'
import '../styles/animations.css'

function formatTime (isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
  } catch { return '' }
}

const MessageBubble = memo(function MessageBubble ({
  message,
  isStreaming = false,
  streamingContent = '',
  onRegenerate,
  onDelete,
  globalStreaming = false  // true if ANY message is currently streaming
}) {
  const isUser = message.role === 'user'
  const displayContent = isStreaming ? streamingContent : message.content
  const [copied, setCopied] = useState(false)

  async function handleCopy () {
    try {
      await navigator.clipboard.writeText(displayContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* clipboard unavailable */ }
  }

  // Actions only available on completed messages when nothing is streaming
  const actionsAvailable = !isStreaming && !globalStreaming && displayContent

  return (
    <div
      className={`message-bubble ${message.role} message-enter`}
      role="article"
      aria-label={`${isUser ? 'You' : 'CodeLoom'}: ${isUser ? message.content : 'response'}`}
    >
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`} aria-hidden="true">
        {isUser ? 'U' : '⚡'}
      </div>

      <div className="message-content-wrapper">
        {/* Role label + timestamp + response time */}
        <div className="message-role-label">
          <span className={isUser ? 'role-user' : 'role-ai'}>
            {isUser ? 'You' : 'CodeLoom'}
          </span>
          {message.timestamp && (
            <span className="message-timestamp">{formatTime(message.timestamp)}</span>
          )}
          {!isUser && message.responseTimeMs && (
            <span className="response-time" title="Time to generate response">
              ⚡ {(message.responseTimeMs / 1000).toFixed(1)}s
            </span>
          )}
        </div>

        {/* Message content */}
        {isUser ? (
          <div className="user-bubble message-content">{message.content}</div>
        ) : (
          <div className={`assistant-content message-content ${isStreaming ? 'streaming-message' : ''}`}>
            <MarkdownRenderer
              content={displayContent}
              isStreaming={isStreaming && Boolean(displayContent)}
            />
          </div>
        )}

        {/* Hover action bar */}
        {actionsAvailable && (
          <div className="message-actions" aria-label="Message actions">
            <button
              className={`msg-action-btn ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label="Copy message"
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>

            {!isUser && onRegenerate && (
              <button
                className="msg-action-btn"
                onClick={() => onRegenerate(message.id)}
                title="Regenerate response"
                aria-label="Regenerate this response"
              >
                ↻ Regenerate
              </button>
            )}

            {onDelete && (
              <button
                className="msg-action-btn danger"
                onClick={() => onDelete(message.id)}
                title="Delete message"
                aria-label="Delete this message"
              >
                🗑
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
})

export default MessageBubble
