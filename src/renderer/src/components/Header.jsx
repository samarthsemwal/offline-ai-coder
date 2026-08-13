/**
 * Header — src/renderer/src/components/Header.jsx
 *
 * Top bar containing:
 * - macOS traffic light spacer (for hiddenInset titleBar)
 * - Sidebar toggle button
 * - App title
 * - Model selector dropdown (dynamic from Ollama)
 * - "Add Model" button
 * - Connection status indicator (live polling)
 */
import '../styles/header.css'

/**
 * @param {Object} props
 * @param {boolean}   props.sidebarOpen          - Is sidebar currently visible?
 * @param {Function}  props.onToggleSidebar       - Toggle sidebar open/closed
 * @param {boolean}   props.connected             - Is Ollama reachable?
 * @param {boolean}   props.isLoading             - Initial connection check in progress
 * @param {Array}     props.models                - [{name, size}] from /api/tags
 * @param {string}    props.selectedModel         - Currently selected model name
 * @param {Function}  props.onModelChange         - Called with new model name
 * @param {Function}  props.onAddModelClick       - Open the Add Model modal
 */
export default function Header ({
  sidebarOpen,
  onToggleSidebar,
  connected,
  isLoading,
  models,
  selectedModel,
  onModelChange,
  onAddModelClick
}) {
  const statusClass = isLoading ? 'loading' : (connected ? 'connected' : 'disconnected')
  const statusText = isLoading ? 'Connecting…' : (connected ? 'Connected' : 'Ollama not running')

  return (
    <header className="app-header" role="banner">
      {/* macOS traffic light spacer */}
      <div className="header-traffic-light-space" aria-hidden="true" />

      {/* Sidebar toggle */}
      <button
        className="btn-sidebar-toggle"
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={sidebarOpen}
        id="sidebar-toggle-btn"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* App title */}
      <div className="header-title">
        <div className="header-title-icon" aria-hidden="true">⚡</div>
        <span>Offline Coder Chat</span>
      </div>

      {/* Center: Model selector */}
      <div className="header-center">
        <div className="model-selector-wrapper">
          <select
            className="model-select"
            value={selectedModel}
            onChange={e => onModelChange(e.target.value)}
            disabled={!connected || models.length === 0}
            aria-label="Select AI model"
            id="model-selector"
            title="Select AI model"
          >
            {models.length === 0 ? (
              <option value={selectedModel}>{selectedModel}</option>
            ) : (
              models.map(model => (
                <option key={model.name} value={model.name}>
                  {model.name}
                </option>
              ))
            )}
          </select>
          <span className="model-select-chevron" aria-hidden="true">▾</span>
        </div>
      </div>

      {/* Right: Add model + connection status */}
      <div className="header-right">
        <button
          className="btn-add-model"
          onClick={onAddModelClick}
          disabled={!connected}
          title="Download a new model from Ollama registry"
          id="add-model-btn"
        >
          + Add Model
        </button>

        <div
          className={`connection-status ${statusClass}`}
          role="status"
          aria-live="polite"
          aria-label={statusText}
          title={statusText}
        >
          <span
            className={`status-dot ${statusClass === 'connected' ? 'status-dot-connected' : ''}`}
            aria-hidden="true"
          />
          <span>{statusText}</span>
        </div>
      </div>
    </header>
  )
}
