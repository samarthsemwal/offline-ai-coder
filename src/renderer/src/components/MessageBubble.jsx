/**
 * MessageBubble — src/renderer/src/components/MessageBubble.jsx
 *
 * Renders a single chat message — either user or assistant.
 * User messages get a styled bubble; assistant messages render full markdown.
 */
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
 * @param {{ id, role, content, timestamp }} props.message
 * @param {boolean} props.isStreaming     - Is this the message currently being streamed?
 * @param {string}  props.streamingContent - Partial content during streaming
 */
export default function MessageBubble ({ message, isStreaming = false, streamingContent = '' }) {
  const isUser = message.role === 'user'
  const displayContent = isStreaming ? streamingContent : message.content

  return (
    <div
      className={`message-bubble ${message.role} message-enter`}
      role="article"
      aria-label={`${isUser ? 'You' : 'Assistant'}: ${isUser ? message.content : 'response'}`}
    >
      {/* Avatar */}
      <div className="message-avatar" aria-hidden="true">
        {isUser ? '👤' : '🤖'}
      </div>

      <div className="message-content-wrapper">
        {/* Role label + timestamp */}
        <div className="message-role-label">
          <span>{isUser ? 'You' : 'Assistant'}</span>
          {message.timestamp && (
            <span className="message-timestamp">{formatTime(message.timestamp)}</span>
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
