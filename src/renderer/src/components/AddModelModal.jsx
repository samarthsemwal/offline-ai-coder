/**
 * AddModelModal — src/renderer/src/components/AddModelModal.jsx
 *
 * Lets the user pull a new model from Ollama's registry.
 * Shows a live progress bar during the download (Ollama streams progress as NDJSON).
 */
import { useState, useRef } from 'react'
import { pullModel } from '../services/ollamaService.js'
import '../styles/modals.css'
import '../styles/animations.css'

/**
 * @param {Object} props
 * @param {Function} props.onClose    - Called when modal should close
 * @param {Function} props.onSuccess  - Called when model is successfully pulled
 */
export default function AddModelModal ({ onClose, onSuccess }) {
  const [modelName, setModelName] = useState('')
  const [isPulling, setIsPulling] = useState(false)
  const [progress, setProgress] = useState({ percent: null, status: '' })
  const [error, setError] = useState(null)
  const [done, setDone] = useState(false)
  const abortRef = useRef(null)

  function handleClose () {
    // Cancel any in-progress pull
    abortRef.current?.abort()
    onClose()
  }

  async function handlePull () {
    const name = modelName.trim()
    if (!name) return

    setError(null)
    setDone(false)
    setIsPulling(true)
    setProgress({ percent: null, status: 'Starting download…' })

    abortRef.current = new AbortController()

    await pullModel({
      modelName: name,
      signal: abortRef.current.signal,

      onProgress: ({ percent, status }) => {
        setProgress({ percent, status })
      },

      onDone: () => {
        setIsPulling(false)
        setDone(true)
        setProgress({ percent: 100, status: 'Download complete!' })
        onSuccess?.()
        // Auto-close after 1.5s
        setTimeout(onClose, 1500)
      },

      onError: (err) => {
        setIsPulling(false)
        setError(err.message)
        setProgress({ percent: null, status: '' })
      }
    })
  }

  function handleKeyDown (e) {
    if (e.key === 'Enter' && !isPulling) handlePull()
    if (e.key === 'Escape') handleClose()
  }

  return (
    <div
      className="modal-overlay"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="add-model-title"
    >
      <div
        className="modal-card"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="modal-header">
          <div>
            <h2 className="modal-title" id="add-model-title">Download Model</h2>
            <p className="modal-subtitle">Pull a model directly from the Ollama registry</p>
          </div>
          <button
            className="btn-modal-close"
            onClick={handleClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        {/* Input */}
        <label className="modal-label" htmlFor="model-name-input">
          Model name
        </label>
        <input
          id="model-name-input"
          className="modal-input"
          type="text"
          placeholder="qwen2.5-coder:14b"
          value={modelName}
          onChange={e => setModelName(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isPulling || done}
          autoFocus
          spellCheck={false}
        />
        <p className="modal-helper-text">
          Examples: <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>qwen2.5-coder:14b</code>,{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>llama3.2:3b</code>,{' '}
          <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.85em' }}>deepseek-coder:6.7b</code>.
          Find models at{' '}
          <a
            href="https://ollama.com/library"
            style={{ color: 'var(--accent)' }}
            onClick={e => { e.preventDefault(); /* open externally */ }}
          >
            ollama.com/library
          </a>
        </p>

        {/* Progress section — shown while pulling */}
        {(isPulling || done) && (
          <div className="progress-section">
            <div className="progress-label">
              <span className="progress-status">{progress.status}</span>
              {progress.percent !== null && (
                <span className="progress-percent">{progress.percent}%</span>
              )}
            </div>
            <div className="progress-track">
              <div
                className={`progress-fill ${progress.percent === null ? 'indeterminate' : ''}`}
                style={progress.percent !== null ? { width: `${progress.percent}%` } : {}}
                role="progressbar"
                aria-valuenow={progress.percent ?? 0}
                aria-valuemin={0}
                aria-valuemax={100}
              />
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div className="modal-error" role="alert">
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {/* Actions */}
        <div className="modal-actions">
          <button
            className="btn-modal-cancel"
            onClick={handleClose}
            disabled={false}
          >
            {done ? 'Close' : 'Cancel'}
          </button>
          {!done && (
            <button
              className="btn-modal-primary"
              onClick={handlePull}
              disabled={!modelName.trim() || isPulling}
              id="pull-model-btn"
            >
              {isPulling ? (
                <><span className="spinning" style={{ display: 'inline-block' }}>⟳</span> Pulling…</>
              ) : 'Pull Model'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
