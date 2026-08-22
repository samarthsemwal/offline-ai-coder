/**
 * CodingActions — src/renderer/src/components/CodingActions.jsx  (CodeLoom)
 *
 * Collapsible toolbar showing 7 coding action buttons.
 * When an action is clicked, it builds the appropriate structured prompt
 * using the code from the attached file or current input text.
 */
import { CODING_ACTIONS } from '../services/codingPrompts.js'
import '../styles/chat.css'

/**
 * @param {Object}   props
 * @param {Function} props.onAction       - Called with the constructed prompt string
 * @param {string}   props.currentInput   - Current textarea value (used as code if no file attached)
 * @param {Object}   [props.attachedFile] - Attached file context
 */
export default function CodingActions ({ onAction, currentInput, attachedFile }) {
  function handleAction (action) {
    const code = attachedFile?.content || currentInput || ''
    const language = attachedFile?.language || 'text'
    const fileName = attachedFile?.name || ''

    if (!code.trim()) {
      // No code — use action as a generic prefix prompt
      onAction(`${action.label}: `)
      return
    }

    const prompt = action.builder({
      code,
      language,
      fileName,
      userQuestion: currentInput && attachedFile ? currentInput : ''
    })

    onAction(prompt)
  }

  return (
    <div className="coding-actions-toolbar" role="toolbar" aria-label="Coding actions">
      <span className="coding-actions-label">Quick Actions:</span>
      <div className="coding-actions-buttons">
        {CODING_ACTIONS.map(action => (
          <button
            key={action.id}
            className="coding-action-btn"
            onClick={() => handleAction(action)}
            title={action.description}
            aria-label={action.description}
          >
            <span className="coding-action-icon" aria-hidden="true">{action.icon}</span>
            <span>{action.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
