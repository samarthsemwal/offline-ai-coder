/**
 * Onboarding — src/renderer/src/components/Onboarding.jsx  (CodeLoom)
 *
 * 3-step first-run experience. Shown only when settings.firstRunComplete === false.
 * Always skippable.
 */
import { useState } from 'react'
import '../styles/onboarding.css'

export default function Onboarding ({ connected, models, onComplete, onSkip }) {
  const [step, setStep] = useState(1)
  const [selectedModel, setSelectedModel] = useState('')

  function handleNext () {
    if (step < 3) setStep(s => s + 1)
    else onComplete(selectedModel)
  }

  function handleBack () {
    if (step > 1) setStep(s => s - 1)
  }

  return (
    <div className="onboarding-overlay">
      <div className="onboarding-card">
        {/* Skip button */}
        <button className="onboarding-skip" onClick={onSkip} aria-label="Skip setup">
          Skip →
        </button>

        {/* Step indicators */}
        <div className="onboarding-steps" aria-label="Setup progress">
          {[1, 2, 3].map(n => (
            <div key={n} className={`onboarding-step-dot ${step >= n ? 'active' : ''}`} />
          ))}
        </div>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="onboarding-content">
            <div className="onboarding-icon" aria-hidden="true">⚡</div>
            <h1 className="onboarding-title">Welcome to CodeLoom</h1>
            <p className="onboarding-subtitle">Private Local AI Coding Assistant</p>
            <p className="onboarding-desc">
              CodeLoom is a desktop AI assistant for developers that runs entirely on your machine.
              No API keys, no subscriptions, no data leaving your computer.
            </p>
            <p className="onboarding-tagline">Your code. Your model. Your machine.</p>
          </div>
        )}

        {/* Step 2: Check Ollama */}
        {step === 2 && (
          <div className="onboarding-content">
            <div className="onboarding-icon" aria-hidden="true">🔌</div>
            <h2 className="onboarding-title">Check Ollama</h2>
            <p className="onboarding-desc">
              CodeLoom uses <strong>Ollama</strong> to run AI models locally.
            </p>

            <div className={`onboarding-status-box ${connected ? 'ok' : 'err'}`}>
              {connected ? (
                <>
                  <span className="onboarding-status-icon">✅</span>
                  <div>
                    <strong>Ollama is running</strong>
                    <p>{models.length > 0
                      ? `${models.length} model${models.length !== 1 ? 's' : ''} installed`
                      : 'No models installed yet — pull one in the next step'}</p>
                  </div>
                </>
              ) : (
                <>
                  <span className="onboarding-status-icon">⚠️</span>
                  <div>
                    <strong>Ollama not detected</strong>
                    <p>Please start Ollama and come back, or skip setup.</p>
                    <code>ollama serve</code>
                  </div>
                </>
              )}
            </div>

            <p className="onboarding-helper">
              <a
                href="https://ollama.com/download"
                onClick={e => { e.preventDefault(); window.electronAPI?.openExternal('https://ollama.com/download') }}
              >
                Install Ollama →
              </a>
            </p>
          </div>
        )}

        {/* Step 3: Choose model */}
        {step === 3 && (
          <div className="onboarding-content">
            <div className="onboarding-icon" aria-hidden="true">🤖</div>
            <h2 className="onboarding-title">Choose Your Model</h2>
            <p className="onboarding-desc">
              Select the model you want to use. We recommend <strong>qwen2.5-coder:7b</strong> for coding tasks.
            </p>

            {models.length > 0 ? (
              <div className="onboarding-model-list">
                {models.map(m => (
                  <label key={m.name} className={`onboarding-model-option ${selectedModel === m.name ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="model"
                      value={m.name}
                      checked={selectedModel === m.name}
                      onChange={() => setSelectedModel(m.name)}
                    />
                    <div>
                      <span className="model-option-name">{m.name}</span>
                      {m.sizeFormatted && (
                        <span className="model-option-size">{m.sizeFormatted}</span>
                      )}
                    </div>
                    {m.name.includes('qwen2.5-coder') && (
                      <span className="model-option-badge">Recommended</span>
                    )}
                  </label>
                ))}
              </div>
            ) : (
              <div className="onboarding-no-models">
                <p>No models installed. Pull one to get started:</p>
                <code>ollama pull qwen2.5-coder:7b</code>
                <p className="onboarding-helper">
                  You can also add models later via <strong>+ Add Model</strong> in the app.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation */}
        <div className="onboarding-nav">
          {step > 1 && (
            <button className="onboarding-back-btn" onClick={handleBack}>← Back</button>
          )}
          <button
            className="onboarding-next-btn"
            onClick={handleNext}
            disabled={step === 3 && models.length > 0 && !selectedModel}
          >
            {step === 3 ? '🚀 Start Coding' : 'Next →'}
          </button>
        </div>
      </div>
    </div>
  )
}
