/**
 * MessageBubble — src/renderer/src/components/MessageBubble.jsx
 *
 * Renders a single chat message — either user or assistant.
 * User messages get a styled bubble; assistant messages render full markdown.
 * Features: copy button on hover, response time, enhanced avatars.
 */
import { useState } from 'react'
import MarkdownRenderer from './MarkdownRenderer.jsx'
import '../styles/chat.css'
import '../styles/animations.css'

/**
 * Format an ISO timestamp into a human-readable short time string.
 * e.g. "3:42 PM"
 */
function formatTime (isoString) {
  if (!isoString) return ''
  try {
    return new Date(isoString).toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit'
    })
  } catch {
    return ''
  }
}

/**
 * @param {Object} props
 * @param {{ id, role, content, timestamp, responseTimeMs }} props.message
 * @param {boolean} props.isStreaming     - Is this the message currently being streamed?
 * @param {string}  props.streamingContent - Partial content during streaming
 */
export default function MessageBubble ({ message, isStreaming = false, streamingContent = '' }) {
  const isUser = message.role === 'user'
  const displayContent = isStreaming ? streamingContent : message.content
  const [copied, setCopied] = useState(false)

  async function handleCopy () {
    try {
      await navigator.clipboard.writeText(displayContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available
    }
  }

  return (
    <div
      className={`message-bubble ${message.role} message-enter`}
      role="article"
      aria-label={`${isUser ? 'You' : 'Assistant'}: ${isUser ? message.content : 'response'}`}
    >
      {/* Avatar */}
      <div className={`message-avatar ${isUser ? 'avatar-user' : 'avatar-ai'}`} aria-hidden="true">
        {isUser ? 'U' : 'AI'}
      </div>

      <div className="message-content-wrapper">
        {/* Role label + timestamp + response time */}
        <div className="message-role-label">
          <span className={isUser ? 'role-user' : 'role-ai'}>{isUser ? 'You' : 'Assistant'}</span>
          {message.timestamp && (
            <span className="message-timestamp">{formatTime(message.timestamp)}</span>
          )}
          {!isUser && message.responseTimeMs && (
            <span className="response-time" title="Time to generate response">
              ⚡ {(message.responseTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          {/* Copy button */}
          {!isStreaming && displayContent && (
            <button
              className={`btn-copy-message ${copied ? 'copied' : ''}`}
              onClick={handleCopy}
              title={copied ? 'Copied!' : 'Copy message'}
              aria-label={copied ? 'Copied to clipboard' : 'Copy message to clipboard'}
            >
              {copied ? '✓ Copied' : '⎘ Copy'}
            </button>
          )}
        </div>

        {/* Message content */}
        {isUser ? (
          <div className="user-bubble message-content">
            {message.content}
          </div>
        ) : (
          <div className={`assistant-content message-content ${isStreaming ? 'streaming-message' : ''}`}>
            <MarkdownRenderer
              content={displayContent}
              isStreaming={isStreaming && Boolean(displayContent)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
