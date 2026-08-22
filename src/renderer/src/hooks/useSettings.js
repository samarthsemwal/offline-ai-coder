/**
 * Settings Hook — src/renderer/src/hooks/useSettings.js
 *
 * Manages application settings with:
 * - Local persistence via IPC (stored as codeloom-settings.json in userData)
 * - Merge with defaults on load (new settings survive app upgrades)
 * - Debounced auto-save on changes
 */

import { useState, useEffect, useCallback } from 'react'
import { SYSTEM_PROMPT } from '../config.js'

// ─── Default Settings ─────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS = {
  // General
  fontSize: 15,
  sidebarOpen: true,

  // AI
  defaultModel: '',            // populated from Ollama at runtime
  temperature: 0.2,            // default: precise coding
  temperaturePreset: 'precise', // 'precise' | 'balanced' | 'creative' | 'custom'
  systemPrompt: SYSTEM_PROMPT,
  contextBudgetTokens: 6000,

  // Voice
  voiceEnabled: true,

  // Onboarding
  firstRunComplete: false,

  // Internal / future fields
  version: 1
}

// ─── Temperature Presets ──────────────────────────────────────────────────────

export const TEMPERATURE_PRESETS = {
  precise: { label: 'Precise Coding', value: 0.2, description: 'Deterministic, minimal hallucination. Best for code generation.' },
  balanced: { label: 'Balanced', value: 0.5, description: 'Mix of creativity and accuracy. Good for explanations and docs.' },
  creative: { label: 'Creative', value: 0.9, description: 'More varied responses. Good for brainstorming and alternatives.' },
  custom: { label: 'Custom', value: null, description: 'Set your own temperature value.' }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * @returns {{
 *   settings: Object,
 *   updateSetting: (key: string, value: any) => void,
 *   updateSettings: (patch: Object) => void,
 *   resetSettings: () => void,
 *   isLoaded: boolean
 * }}
 */
export function useSettings () {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)
  const [isLoaded, setIsLoaded] = useState(false)

  // Load settings from disk on mount
  useEffect(() => {
    async function load () {
      try {
        const saved = await window.electronAPI.loadSettings()
        if (saved && typeof saved === 'object') {
          // Merge saved settings with defaults — new keys get their defaults
          setSettings(prev => ({
            ...DEFAULT_SETTINGS,
            ...saved,
            // Ensure system prompt falls back to current default if not set
            systemPrompt: saved.systemPrompt || DEFAULT_SETTINGS.systemPrompt
          }))
        }
      } catch (err) {
        console.warn('[useSettings] Failed to load settings:', err)
      } finally {
        setIsLoaded(true)
      }
    }
    load()
  }, [])

  // Persist settings whenever they change (debounced via the save function's own timing)
  const persistSettings = useCallback(async (newSettings) => {
    try {
      await window.electronAPI.saveSettings(newSettings)
    } catch (err) {
      console.warn('[useSettings] Failed to save settings:', err)
    }
  }, [])

  /**
   * Update a single setting key.
   * @param {string} key
   * @param {*} value
   */
  const updateSetting = useCallback((key, value) => {
    setSettings(prev => {
      const next = { ...prev, [key]: value }
      persistSettings(next)
      return next
    })
  }, [persistSettings])

  /**
   * Update multiple settings at once.
   * @param {Object} patch
   */
  const updateSettings = useCallback((patch) => {
    setSettings(prev => {
      const next = { ...prev, ...patch }
      persistSettings(next)
      return next
    })
  }, [persistSettings])

  /**
   * Reset all settings to defaults and persist.
   */
  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS)
    persistSettings(DEFAULT_SETTINGS)
  }, [persistSettings])

  return { settings, updateSetting, updateSettings, resetSettings, isLoaded }
}
