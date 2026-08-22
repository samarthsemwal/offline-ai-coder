/**
 * EmptyState (HomeScreen) — src/renderer/src/components/EmptyState.jsx  (CodeLoom)
 *
 * Shown when no conversation is active.
 * Displays: app branding, coding quick actions, recent chats placeholder, status.
 */
import { QUICK_PROMPTS, APP_NAME, APP_TAGLINE } from '../config.js'
import { CODING_ACTIONS } from '../services/codingPrompts.js'
import '../styles/modals.css'

/**
 * @param {Object}   props
 * @param {Function} props.onPromptSelect  - Called when user clicks a quick prompt
 */
export default function EmptyState ({ onPromptSelect }) {
  return (
    <div className="empty-state">
      {/* Hero */}
      <div className="empty-state-hero">
        <div className="empty-state-icon" aria-hidden="true">⚡</div>
        <h1 className="empty-state-title">{APP_NAME}</h1>
        <p className="empty-state-subtitle">{APP_TAGLINE}</p>
        <p className="empty-state-privacy">
          🔒 AI inference runs locally on your machine via Ollama
        </p>
      </div>

      {/* Coding Quick Actions */}
      <div className="empty-state-actions-section">
        <h2 className="empty-state-section-label">Coding Actions</h2>
        <div className="empty-state-coding-actions">
          {CODING_ACTIONS.map(action => (
            <button
              key={action.id}
              className="empty-action-card"
              onClick={() => onPromptSelect(`${action.label}: `)}
              title={action.description}
              aria-label={action.description}
            >
              <span className="empty-action-icon" aria-hidden="true">{action.icon}</span>
              <span className="empty-action-label">{action.label}</span>
              <span className="empty-action-desc">{action.description}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Quick Prompts */}
      <div className="empty-state-actions-section">
        <h2 className="empty-state-section-label">Start with a prompt</h2>
        <div className="empty-state-prompts">
          {QUICK_PROMPTS.map((prompt, i) => (
            <button
              key={i}
              className="prompt-chip"
              onClick={() => onPromptSelect(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
