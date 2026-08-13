/**
 * ConfirmModal — src/renderer/src/components/ConfirmModal.jsx
 * Generic confirmation dialog for destructive actions (session delete, delete all).
 */
import '../styles/modals.css'
import '../styles/animations.css'

/**
 * @param {Object} props
 * @param {string}   props.title       - Modal title
 * @param {string}   props.message     - Description of what will be deleted
 * @param {string}   props.confirmText - Text for the confirm button (default: "Delete")
 * @param {Function} props.onConfirm   - Called when user confirms
 * @param {Function} props.onCancel    - Called when user cancels or closes
 */
export default function ConfirmModal ({
  title = 'Are you sure?',
  message,
  confirmText = 'Delete',
  onConfirm,
  onCancel
}) {
  return (
    <div className="modal-overlay" onClick={onCancel} role="dialog" aria-modal="true">
      <div
        className="modal-card"
        style={{ maxWidth: 400 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="confirm-modal-icon">🗑️</div>

        <div className="modal-header" style={{ marginBottom: 12 }}>
          <div>
            <h2 className="modal-title">{title}</h2>
            {message && <p className="confirm-modal-message">{message}</p>}
          </div>
        </div>

        <div className="modal-actions">
          <button className="btn-modal-cancel" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn-modal-danger" onClick={onConfirm} id="confirm-delete-btn">
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  )
}
