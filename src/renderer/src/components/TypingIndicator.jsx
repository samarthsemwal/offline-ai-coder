/**
 * TypingIndicator — src/renderer/src/components/TypingIndicator.jsx
 * Shows three animated bouncing dots while waiting for the first streaming token.
 */
import '../styles/chat.css'
import '../styles/animations.css'

export default function TypingIndicator () {
  return (
    <div className="typing-indicator" aria-label="Assistant is thinking">
      <span className="typing-dot" />
      <span className="typing-dot" />
      <span className="typing-dot" />
    </div>
  )
}
