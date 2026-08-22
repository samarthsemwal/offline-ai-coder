/**
 * PromptLibrary — src/renderer/src/components/PromptLibrary.jsx  (CodeLoom)
 *
 * Browse built-in prompts, run them, save/edit/delete custom prompts.
 */
import { useState, useEffect } from 'react'
import {
  BUILTIN_PROMPTS,
  groupBuiltinsByCategory,
  loadCustomPrompts,
  addCustomPrompt,
  updateCustomPrompt,
  deleteCustomPrompt
} from '../services/promptLibraryService.js'
import '../styles/prompt-library.css'

export default function PromptLibrary ({ onClose, onSelectPrompt }) {
  const [customPrompts, setCustomPrompts] = useState([])
  const [editingId, setEditingId] = useState(null)
  const [editTitle, setEditTitle] = useState('')
  const [editTemplate, setEditTemplate] = useState('')
  const [showNewForm, setShowNewForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newTemplate, setNewTemplate] = useState('')
  const [activeTab, setActiveTab] = useState('builtin')

  useEffect(() => {
    loadCustomPrompts().then(setCustomPrompts)
  }, [])

  async function handleSaveNew () {
    if (!newTitle.trim() || !newTemplate.trim()) return
    const updated = await addCustomPrompt({ title: newTitle, template: newTemplate }, customPrompts)
    setCustomPrompts(updated)
    setNewTitle('')
    setNewTemplate('')
    setShowNewForm(false)
  }

  async function handleSaveEdit (id) {
    const updated = await updateCustomPrompt(id, { title: editTitle, template: editTemplate }, customPrompts)
    setCustomPrompts(updated)
    setEditingId(null)
  }

  async function handleDelete (id) {
    const updated = await deleteCustomPrompt(id, customPrompts)
    setCustomPrompts(updated)
  }

  function startEdit (prompt) {
    setEditingId(prompt.id)
    setEditTitle(prompt.title)
    setEditTemplate(prompt.template)
  }

  const builtinGroups = groupBuiltinsByCategory()

  return (
    <div className="pl-overlay" role="dialog" aria-modal="true" aria-label="Prompt Library">
      <div className="pl-panel">
        <div className="pl-header">
          <h2 className="pl-title">📚 Prompt Library</h2>
          <button className="btn-modal-close" onClick={onClose} aria-label="Close prompt library">×</button>
        </div>

        {/* Tabs */}
        <div className="pl-tabs">
          <button
            className={`pl-tab ${activeTab === 'builtin' ? 'active' : ''}`}
            onClick={() => setActiveTab('builtin')}
          >Built-in ({BUILTIN_PROMPTS.length})</button>
          <button
            className={`pl-tab ${activeTab === 'custom' ? 'active' : ''}`}
            onClick={() => setActiveTab('custom')}
          >Custom ({customPrompts.length})</button>
        </div>

        <div className="pl-content">
          {/* Built-in tab */}
          {activeTab === 'builtin' && (
            <div className="pl-builtin-list">
              {Object.entries(builtinGroups).map(([category, prompts]) => (
                <div key={category} className="pl-category">
                  <div className="pl-category-label">{category}</div>
                  {prompts.map(prompt => (
                    <div key={prompt.id} className="pl-prompt-item">
                      <div className="pl-prompt-info">
                        <span className="pl-prompt-title">{prompt.title}</span>
                        <span className="pl-prompt-preview">
                          {prompt.template.slice(0, 80)}{prompt.template.length > 80 ? '…' : ''}
                        </span>
                      </div>
                      <button
                        className="pl-run-btn"
                        onClick={() => onSelectPrompt(prompt.template)}
                        aria-label={`Use prompt: ${prompt.title}`}
                      >
                        Use →
                      </button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Custom tab */}
          {activeTab === 'custom' && (
            <div className="pl-custom-list">
              {/* New prompt form */}
              {showNewForm ? (
                <div className="pl-new-form">
                  <input
                    className="pl-input"
                    placeholder="Prompt title…"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    autoFocus
                  />
                  <textarea
                    className="pl-textarea"
                    placeholder="Prompt template… (use [LANGUAGE], [CODE] etc. as placeholders)"
                    value={newTemplate}
                    onChange={e => setNewTemplate(e.target.value)}
                    rows={4}
                  />
                  <div className="pl-form-actions">
                    <button className="pl-save-btn" onClick={handleSaveNew}>Save Prompt</button>
                    <button className="pl-cancel-btn" onClick={() => setShowNewForm(false)}>Cancel</button>
                  </div>
                </div>
              ) : (
                <button className="pl-add-btn" onClick={() => setShowNewForm(true)}>
                  ✚ New Custom Prompt
                </button>
              )}

              {customPrompts.length === 0 && !showNewForm && (
                <div className="pl-empty">
                  <p>No custom prompts yet.</p>
                  <p>Create your own reusable prompts above.</p>
                </div>
              )}

              {customPrompts.map(prompt => (
                <div key={prompt.id} className="pl-prompt-item">
                  {editingId === prompt.id ? (
                    <div className="pl-edit-form">
                      <input
                        className="pl-input"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        autoFocus
                      />
                      <textarea
                        className="pl-textarea"
                        value={editTemplate}
                        onChange={e => setEditTemplate(e.target.value)}
                        rows={4}
                      />
                      <div className="pl-form-actions">
                        <button className="pl-save-btn" onClick={() => handleSaveEdit(prompt.id)}>Save</button>
                        <button className="pl-cancel-btn" onClick={() => setEditingId(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="pl-prompt-info">
                        <span className="pl-prompt-title">{prompt.title}</span>
                        <span className="pl-prompt-preview">
                          {prompt.template.slice(0, 80)}{prompt.template.length > 80 ? '…' : ''}
                        </span>
                      </div>
                      <div className="pl-item-actions">
                        <button
                          className="pl-run-btn"
                          onClick={() => onSelectPrompt(prompt.template)}
                          aria-label={`Use prompt: ${prompt.title}`}
                        >Use →</button>
                        <button
                          className="pl-edit-btn"
                          onClick={() => startEdit(prompt)}
                          aria-label={`Edit prompt: ${prompt.title}`}
                        >✏️</button>
                        <button
                          className="pl-delete-btn"
                          onClick={() => handleDelete(prompt.id)}
                          aria-label={`Delete prompt: ${prompt.title}`}
                        >🗑</button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
