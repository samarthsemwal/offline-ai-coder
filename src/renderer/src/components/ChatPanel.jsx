/**
 * ChatPanel — src/renderer/src/components/ChatPanel.jsx  (CodeLoom)
 *
 * Message list with auto-scroll, error retry, and message actions.
 */
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import EmptyState from './EmptyState.jsx'
import '../styles/chat.css'

export default function ChatPanel ({
  messages,
  isStreaming,
  streamingContent,
  onPromptSelect,
  onRegenerate,
  onDeleteMessage,
  onRetry,
  errorMessage
}) {
  const bottomRef = useRef(null)

  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    el.scrollIntoView({ behavior: streamingContent ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, streamingContent])

  const showEmpty = messages.length === 0 && !isStreaming

  const streamingMessage = isStreaming
    ? { id: '__streaming__', role: 'assistant', content: streamingContent, timestamp: null }
    : null

  return (
    <div className="chat-panel" role="main" aria-label="Chat conversation">
      {showEmpty ? (
        <EmptyState onPromptSelect={onPromptSelect} />
      ) : (
        <div
          className="message-list"
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          aria-relevant="additions"
        >
          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={false}
              globalStreaming={isStreaming}
              onRegenerate={onRegenerate}
              onDelete={onDeleteMessage}
            />
          ))}

          {/* Typing indicator: shown between user send and first token */}
          {isStreaming && !streamingContent && (
            <div className="message-bubble assistant message-enter">
              <div className="message-avatar avatar-ai" aria-hidden="true">⚡</div>
              <div className="message-content-wrapper">
                <div className="message-role-label">
                  <span className="role-ai">CodeLoom</span>
                </div>
                <TypingIndicator />
              </div>
            </div>
          )}

          {/* Live streaming response */}
          {streamingMessage && streamingContent && (
            <MessageBubble
              key="streaming"
              message={streamingMessage}
              isStreaming={true}
              streamingContent={streamingContent}
              globalStreaming={true}
            />
          )}

          {/* Error + retry */}
          {errorMessage && !isStreaming && (
            <div className="stream-error-row">
              <span className="stream-error-icon">⚠️</span>
              <span className="stream-error-text">{errorMessage}</span>
              {onRetry && (
                <button className="btn-retry" onClick={onRetry} aria-label="Retry last message">
                  ↻ Retry
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} aria-hidden="true" style={{ height: 1 }} />
        </div>
      )}
    </div>
  )
}
