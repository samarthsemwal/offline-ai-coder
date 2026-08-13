/**
 * EmptyState — src/renderer/src/components/EmptyState.jsx
 *
 * Shown when no chat session is active.
 * Displays a welcome message and clickable example prompts.
 */
import { EXAMPLE_PROMPTS } from '../config.js'
import '../styles/modals.css'
import '../styles/animations.css'

/**
 * @param {Object} props
 * @param {Function} props.onPromptSelect - Called with the prompt text when a chip is clicked
 */
export default function EmptyState ({ onPromptSelect }) {
  return (
    <div className="empty-state" role="main" aria-label="Welcome screen">
      <div className="empty-state-icon" aria-hidden="true">⚡</div>

      <div>
        <h1 className="empty-state-title">Offline Coder Chat</h1>
        <p className="empty-state-subtitle">
          Your private, fully offline AI coding assistant.<br />
          Ask anything about code, algorithms, or DSA.
        </p>
      </div>

      <div className="empty-state-prompts" role="list" aria-label="Example prompts">
        {EXAMPLE_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            className="prompt-chip"
            role="listitem"
            onClick={() => onPromptSelect(prompt)}
            title={prompt}
            id={`example-prompt-${i}`}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  )
}
