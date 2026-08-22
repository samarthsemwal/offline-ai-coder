/**
 * Settings — src/renderer/src/components/Settings.jsx  (CodeLoom)
 *
 * Full settings panel with 6 sections:
 * General | AI | Voice | Privacy | Keyboard Shortcuts | About
 */
import { useState } from 'react'
import { DEFAULT_SETTINGS, TEMPERATURE_PRESETS } from '../hooks/useSettings.js'
import { APP_NAME, APP_TAGLINE } from '../config.js'
import '../styles/settings.css'

const SECTIONS = ['General', 'AI', 'Voice', 'Privacy', 'Shortcuts', 'About']

export default function Settings ({
  settings,
  onUpdateSetting,
  onUpdateSettings,
  onClose,
  connected,
  models,
  selectedModel,
  onModelChange
}) {
  const [activeSection, setActiveSection] = useState('General')

  function handlePreset (preset) {
    const presetData = TEMPERATURE_PRESETS[preset]
    onUpdateSettings({
      temperaturePreset: preset,
      temperature: presetData.value ?? settings.temperature
    })
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true" aria-label="Settings">
      <div className="settings-panel">
        {/* Header */}
        <div className="settings-header">
          <h2 className="settings-title">⚙️ Settings</h2>
          <button
            className="btn-modal-close"
            onClick={onClose}
            aria-label="Close settings"
            title="Close (Escape)"
          >×</button>
        </div>

        <div className="settings-body">
          {/* Nav */}
          <nav className="settings-nav" aria-label="Settings sections">
            {SECTIONS.map(s => (
              <button
                key={s}
                className={`settings-nav-item ${activeSection === s ? 'active' : ''}`}
                onClick={() => setActiveSection(s)}
                aria-current={activeSection === s ? 'page' : undefined}
              >
                {s}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="settings-content">

            {/* ── General ── */}
            {activeSection === 'General' && (
              <section aria-label="General settings">
                <h3 className="settings-section-title">General</h3>

                <div className="settings-field">
                  <label className="settings-label">Font Size</label>
                  <div className="settings-row">
                    <input
                      type="range" min={13} max={18} step={1}
                      value={settings.fontSize}
                      onChange={e => onUpdateSetting('fontSize', Number(e.target.value))}
                      aria-label="Font size"
                    />
                    <span className="settings-value">{settings.fontSize}px</span>
                  </div>
                  <p className="settings-helper">Affects the chat message text size.</p>
                </div>

                <div className="settings-field">
                  <label className="settings-label">Sidebar</label>
                  <div className="settings-row">
                    <span>Open by default</span>
                    <button
                      className={`settings-toggle ${settings.sidebarOpen ? 'on' : 'off'}`}
                      onClick={() => onUpdateSetting('sidebarOpen', !settings.sidebarOpen)}
                      aria-pressed={settings.sidebarOpen}
                      aria-label="Sidebar open by default"
                    >
                      {settings.sidebarOpen ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* ── AI ── */}
            {activeSection === 'AI' && (
              <section aria-label="AI settings">
                <h3 className="settings-section-title">AI</h3>

                {/* Model */}
                <div className="settings-field">
                  <label className="settings-label" htmlFor="settings-model">Default Model</label>
                  <select
                    id="settings-model"
                    className="settings-select"
                    value={selectedModel}
                    onChange={e => onModelChange(e.target.value)}
                    disabled={!connected || models.length === 0}
                  >
                    {models.length === 0
                      ? <option value={selectedModel}>{selectedModel || 'No models installed'}</option>
                      : models.map(m => (
                          <option key={m.name} value={m.name}>
                            {m.name}{m.sizeFormatted ? ` (${m.sizeFormatted})` : ''}
                          </option>
                        ))
                    }
                  </select>
                </div>

                {/* Model Info Card */}
                <div className="model-info-card">
                  <div className="model-info-row">
                    <span className="model-info-label">Model</span>
                    <span className="model-info-value">{selectedModel || '—'}</span>
                  </div>
                  <div className="model-info-row">
                    <span className="model-info-label">Status</span>
                    <span className={`model-info-value ${connected ? 'status-ok' : 'status-err'}`}>
                      {connected ? '● Ready' : '○ Offline'}
                    </span>
                  </div>
                  <div className="model-info-row">
                    <span className="model-info-label">Provider</span>
                    <span className="model-info-value">Ollama (local)</span>
                  </div>
                  <div className="model-info-row">
                    <span className="model-info-label">Temperature</span>
                    <span className="model-info-value">{settings.temperature.toFixed(2)}</span>
                  </div>
                </div>

                {/* Temperature */}
                <div className="settings-field">
                  <label className="settings-label">Temperature</label>
                  <p className="settings-helper">Controls response creativity. Lower = more deterministic.</p>
                  <div className="temperature-presets">
                    {Object.entries(TEMPERATURE_PRESETS).map(([key, preset]) => (
                      <button
                        key={key}
                        className={`temp-preset-btn ${settings.temperaturePreset === key ? 'active' : ''}`}
                        onClick={() => handlePreset(key)}
                        title={preset.description}
                      >
                        <span className="temp-preset-label">{preset.label}</span>
                        {preset.value !== null && (
                          <span className="temp-preset-value">{preset.value}</span>
                        )}
                      </button>
                    ))}
                  </div>
                  {settings.temperaturePreset === 'custom' && (
                    <div className="settings-row" style={{ marginTop: 12 }}>
                      <input
                        type="range" min={0} max={2} step={0.05}
                        value={settings.temperature}
                        onChange={e => onUpdateSetting('temperature', Number(e.target.value))}
                        aria-label="Custom temperature"
                      />
                      <span className="settings-value">{settings.temperature.toFixed(2)}</span>
                    </div>
                  )}
                </div>

                {/* Context Budget */}
                <div className="settings-field">
                  <label className="settings-label">Context Budget</label>
                  <div className="settings-row">
                    <input
                      type="range" min={2000} max={16000} step={500}
                      value={settings.contextBudgetTokens}
                      onChange={e => onUpdateSetting('contextBudgetTokens', Number(e.target.value))}
                      aria-label="Context budget in tokens"
                    />
                    <span className="settings-value">
                      {(settings.contextBudgetTokens / 1000).toFixed(1)}k tokens
                    </span>
                  </div>
                  <p className="settings-helper">
                    Maximum tokens reserved for file context. Larger = more code, more VRAM usage.
                  </p>
                </div>

                {/* System Prompt */}
                <div className="settings-field">
                  <label className="settings-label" htmlFor="settings-system-prompt">System Prompt</label>
                  <textarea
                    id="settings-system-prompt"
                    className="settings-textarea"
                    value={settings.systemPrompt}
                    onChange={e => onUpdateSetting('systemPrompt', e.target.value)}
                    rows={6}
                    aria-label="System prompt"
                  />
                  <p className="settings-helper">
                    Injected at the start of every conversation. Applied on next message.
                  </p>
                  <button
                    className="settings-link-btn"
                    onClick={() => onUpdateSetting('systemPrompt', DEFAULT_SETTINGS.systemPrompt)}
                  >
                    Reset to default
                  </button>
                </div>
              </section>
            )}

            {/* ── Voice ── */}
            {activeSection === 'Voice' && (
              <section aria-label="Voice settings">
                <h3 className="settings-section-title">Voice Input</h3>

                <div className="settings-field">
                  <div className="settings-row">
                    <span className="settings-label">Enable Voice Input</span>
                    <button
                      className={`settings-toggle ${settings.voiceEnabled ? 'on' : 'off'}`}
                      onClick={() => onUpdateSetting('voiceEnabled', !settings.voiceEnabled)}
                      aria-pressed={settings.voiceEnabled}
                    >
                      {settings.voiceEnabled ? 'On' : 'Off'}
                    </button>
                  </div>
                </div>

                <div className="settings-info-box">
                  <h4>Voice Model: Whisper tiny.en</h4>
                  <p>
                    Voice transcription uses <strong>openai/whisper-tiny.en</strong> running locally
                    via Transformers.js (WebAssembly). The model file (~42 MB) is downloaded once
                    on first use and cached locally. No audio is sent to any external server.
                  </p>
                  <p>
                    <strong>Shortcut:</strong> <kbd>⌘⌥V</kbd> to start/stop recording.
                    Transcription is placed into the input field for you to review before sending.
                  </p>
                </div>
              </section>
            )}

            {/* ── Privacy ── */}
            {activeSection === 'Privacy' && (
              <section aria-label="Privacy information">
                <h3 className="settings-section-title">Privacy Model</h3>

                <div className="settings-info-box privacy-box">
                  <h4>🔒 How your data is handled</h4>

                  <div className="privacy-item">
                    <span className="privacy-icon">🤖</span>
                    <div>
                      <strong>AI Inference</strong>
                      <p>Processed locally by Ollama on your machine. Your prompts and responses never leave your computer during inference.</p>
                    </div>
                  </div>

                  <div className="privacy-item">
                    <span className="privacy-icon">💬</span>
                    <div>
                      <strong>Conversations</strong>
                      <p>Saved as JSON files in your local application data directory. Never uploaded anywhere.</p>
                    </div>
                  </div>

                  <div className="privacy-item">
                    <span className="privacy-icon">🎙️</span>
                    <div>
                      <strong>Voice Recognition</strong>
                      <p>Transcribed locally using Whisper (WebAssembly). Audio recordings are not persisted.</p>
                    </div>
                  </div>

                  <div className="privacy-item">
                    <span className="privacy-icon">📁</span>
                    <div>
                      <strong>Imported Files</strong>
                      <p>File content is only processed locally and sent to your local Ollama instance. Never uploaded externally.</p>
                    </div>
                  </div>

                  <div className="settings-helper" style={{ marginTop: 16, fontStyle: 'italic' }}>
                    Note: Internet access may be required for initial installation of Ollama or downloading model weights.
                    After that, core functionality works fully offline.
                  </div>
                </div>
              </section>
            )}

            {/* ── Keyboard Shortcuts ── */}
            {activeSection === 'Shortcuts' && (
              <section aria-label="Keyboard shortcuts">
                <h3 className="settings-section-title">Keyboard Shortcuts</h3>
                <table className="shortcuts-table">
                  <thead>
                    <tr><th>Action</th><th>Shortcut</th></tr>
                  </thead>
                  <tbody>
                    {[
                      ['New chat', '⌘N'],
                      ['Toggle sidebar', '⌘B'],
                      ['Focus input', '⌘/'],
                      ['Open settings', '⌘,'],
                      ['Search conversations', '⌘F'],
                      ['Clear current chat', '⌘K'],
                      ['Toggle coding actions', '⌘⌥C'],
                      ['Voice input', '⌘⌥V'],
                      ['Prompt library', '⌘⌥P'],
                      ['Close modal/settings', 'Escape'],
                      ['Send message', 'Enter'],
                      ['New line in input', 'Shift+Enter'],
                      ['Stop generation', '⏹ (Stop button)']
                    ].map(([action, key]) => (
                      <tr key={action}>
                        <td>{action}</td>
                        <td><kbd>{key}</kbd></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            )}

            {/* ── About ── */}
            {activeSection === 'About' && (
              <section aria-label="About CodeLoom">
                <h3 className="settings-section-title">About</h3>

                <div className="about-hero">
                  <span className="about-icon" aria-hidden="true">⚡</span>
                  <h4>{APP_NAME}</h4>
                  <p>{APP_TAGLINE}</p>
                </div>

                <div className="about-info-grid">
                  <div className="about-info-row">
                    <span>Version</span><span>1.0.0</span>
                  </div>
                  <div className="about-info-row">
                    <span>Ollama</span>
                    <span className={connected ? 'status-ok' : 'status-err'}>
                      {connected ? '● Connected' : '○ Offline'}
                    </span>
                  </div>
                  <div className="about-info-row">
                    <span>Current Model</span><span>{selectedModel || '—'}</span>
                  </div>
                  <div className="about-info-row">
                    <span>Framework</span><span>Electron + React + Vite</span>
                  </div>
                  <div className="about-info-row">
                    <span>AI Engine</span><span>Ollama (local)</span>
                  </div>
                  <div className="about-info-row">
                    <span>Voice Model</span><span>Whisper tiny.en (local)</span>
                  </div>
                  <div className="about-info-row">
                    <span>License</span><span>MIT</span>
                  </div>
                </div>

                <div className="settings-info-box" style={{ marginTop: 20 }}>
                  <p><strong>Tech Stack:</strong> Electron, React 18, Vite, Ollama REST API,
                    @huggingface/transformers (Whisper), react-markdown, react-syntax-highlighter,
                    uuid, CSS design tokens.</p>
                </div>
              </section>
            )}

          </div>
        </div>
      </div>
    </div>
  )
}
