/**
 * ChatPanel — src/renderer/src/components/ChatPanel.jsx
 *
 * The main conversation view:
 * - Scrollable message list, auto-scrolled to bottom on new tokens
 * - Shows EmptyState when no messages
 * - Shows TypingIndicator between user send and first streaming token
 * - Renders streaming assistant message live as tokens arrive
 */
import { useEffect, useRef } from 'react'
import MessageBubble from './MessageBubble.jsx'
import TypingIndicator from './TypingIndicator.jsx'
import EmptyState from './EmptyState.jsx'
import '../styles/chat.css'

/**
 * @param {Object} props
 * @param {Array}    props.messages          - Completed messages
 * @param {boolean}  props.isStreaming       - Is a response currently streaming?
 * @param {string}   props.streamingContent  - Partial content of the streaming response
 * @param {Function} props.onPromptSelect    - Called when user clicks an example prompt
 */
export default function ChatPanel ({
  messages,
  isStreaming,
  streamingContent,
  onPromptSelect
}) {
  const bottomRef = useRef(null)
  const listRef = useRef(null)

  // Auto-scroll to bottom whenever messages or streaming content updates
  useEffect(() => {
    const el = bottomRef.current
    if (!el) return
    // Use smooth scroll during streaming, instant on new message
    el.scrollIntoView({ behavior: streamingContent ? 'auto' : 'smooth', block: 'end' })
  }, [messages.length, streamingContent])

  const showEmpty = messages.length === 0 && !isStreaming

  // A "streaming placeholder" message object for the assistant's current response
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
          ref={listRef}
          role="log"
          aria-live="polite"
          aria-label="Chat messages"
          aria-relevant="additions"
        >
          {/* Completed messages */}
          {messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              isStreaming={false}
            />
          ))}

          {/* Typing indicator: shown after user sends, before first token arrives */}
          {isStreaming && !streamingContent && (
            <div className="message-bubble assistant message-enter">
              <div className="message-avatar" aria-hidden="true">🤖</div>
              <div className="message-content-wrapper">
                <div className="message-role-label">
                  <span>Assistant</span>
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
            />
          )}

          {/* Invisible anchor for auto-scroll */}
          <div ref={bottomRef} aria-hidden="true" style={{ height: 1 }} />
        </div>
      )}
    </div>
  )
}
