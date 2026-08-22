/**
 * Header — src/renderer/src/components/Header.jsx  (CodeLoom)
 */
import '../styles/header.css'

export default function Header ({
  sidebarOpen,
  onToggleSidebar,
  connected,
  isLoading,
  models,
  selectedModel,
  onModelChange,
  onAddModelClick,
  onSettingsClick,
  onPromptLibraryClick
}) {
  const statusClass = isLoading ? 'loading' : (connected ? 'connected' : 'disconnected')
  const statusText = isLoading ? 'Connecting…' : (connected ? 'Connected' : 'Ollama offline')

  // Format model name for display option
  function formatModelOption (model) {
    const name = model.name
    const size = model.sizeFormatted ? ` (${model.sizeFormatted})` : ''
    return `${name}${size}`
  }

  return (
    <header className="app-header" role="banner">
      {/* macOS traffic light spacer */}
      <div className="header-traffic-light-space" aria-hidden="true" />

      {/* Sidebar toggle */}
      <button
        className="btn-sidebar-toggle"
        onClick={onToggleSidebar}
        title={sidebarOpen ? 'Collapse sidebar (⌘B)' : 'Expand sidebar (⌘B)'}
        aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
        aria-expanded={sidebarOpen}
        id="sidebar-toggle-btn"
      >
        {sidebarOpen ? '◀' : '▶'}
      </button>

      {/* App title */}
      <div className="header-title">
        <div className="header-title-icon" aria-hidden="true">⚡</div>
        <span>CodeLoom</span>
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
              <option value={selectedModel}>{selectedModel || 'No models'}</option>
            ) : (
              models.map(model => (
                <option key={model.name} value={model.name}>
                  {formatModelOption(model)}
                </option>
              ))
            )}
          </select>
          <span className="model-select-chevron" aria-hidden="true">▾</span>
        </div>

        {/* Refresh models button */}
        <button
          className="btn-icon-sm"
          onClick={() => window.electronAPI?.checkOllamaStatus?.()}
          title="Refresh model list"
          aria-label="Refresh model list"
        >
          ↻
        </button>
      </div>

      {/* Right: Prompt library + Add model + Settings + Connection status */}
      <div className="header-right">
        <button
          className="btn-icon-sm"
          onClick={onPromptLibraryClick}
          title="Prompt Library (⌘⌥P)"
          aria-label="Open prompt library"
          id="prompt-library-btn"
        >
          📚
        </button>

        <button
          className="btn-add-model"
          onClick={onAddModelClick}
          disabled={!connected}
          title="Download a new Ollama model"
          id="add-model-btn"
        >
          + Add Model
        </button>

        <button
          className="btn-icon-sm"
          onClick={onSettingsClick}
          title="Settings (⌘,)"
          aria-label="Open settings"
          id="settings-btn"
        >
          ⚙️
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
