/**
 * useSettings Hook Tests — src/tests/useSettings.test.js
 *
 * Covers:
 * - Default settings are returned before load completes
 * - Settings are loaded from IPC on mount
 * - Saved settings are merged with defaults (upgrade safety)
 * - updateSetting changes one key and persists
 * - updateSettings changes multiple keys atomically
 * - resetSettings restores all defaults
 * - IPC failure is handled gracefully (defaults used)
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSettings, DEFAULT_SETTINGS } from '../renderer/src/hooks/useSettings.js'

// Reset mocks before each test to avoid cross-test contamination
beforeEach(() => {
  vi.resetAllMocks()
  window.electronAPI.loadSettings.mockResolvedValue({})
  window.electronAPI.saveSettings.mockResolvedValue(true)
})

// ── Default settings ──────────────────────────────────────────────────────────

describe('useSettings — defaults', () => {
  it('starts with isLoaded = false', () => {
    const { result } = renderHook(() => useSettings())
    expect(result.current.isLoaded).toBe(false)
  })

  it('returns default settings before load completes', () => {
    const { result } = renderHook(() => useSettings())
    // isLoaded is false but settings should have default values
    expect(result.current.settings.temperature).toBe(DEFAULT_SETTINGS.temperature)
    expect(result.current.settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
  })

  it('sets isLoaded = true after loading', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))
  })
})

// ── Loading from IPC ──────────────────────────────────────────────────────────

describe('useSettings — loading', () => {
  it('calls electronAPI.loadSettings on mount', async () => {
    renderHook(() => useSettings())
    await waitFor(() => {
      expect(window.electronAPI.loadSettings).toHaveBeenCalledTimes(1)
    })
  })

  it('merges saved settings with defaults', async () => {
    // Only override fontSize — temperature should still come from defaults
    window.electronAPI.loadSettings.mockResolvedValue({ fontSize: 16 })

    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.settings.fontSize).toBe(16)
    expect(result.current.settings.temperature).toBe(DEFAULT_SETTINGS.temperature)
  })

  it('handles load failure gracefully (uses defaults)', async () => {
    window.electronAPI.loadSettings.mockRejectedValue(new Error('IPC failed'))

    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    // Falls back to defaults — no crash
    expect(result.current.settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
  })

  it('preserves custom systemPrompt from saved settings', async () => {
    const custom = 'You are a custom assistant.'
    window.electronAPI.loadSettings.mockResolvedValue({ systemPrompt: custom })

    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    expect(result.current.settings.systemPrompt).toBe(custom)
  })

  it('falls back to default systemPrompt if saved is empty string', async () => {
    window.electronAPI.loadSettings.mockResolvedValue({ systemPrompt: '' })

    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    // Empty string → use default
    expect(result.current.settings.systemPrompt).toBe(DEFAULT_SETTINGS.systemPrompt)
  })
})

// ── updateSetting ─────────────────────────────────────────────────────────────

describe('useSettings — updateSetting', () => {
  it('updates a single setting', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.updateSetting('fontSize', 17)
    })

    expect(result.current.settings.fontSize).toBe(17)
  })

  it('persists the change via IPC', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.updateSetting('fontSize', 18)
    })

    // saveSettings should be called with an object containing the new value
    await waitFor(() => {
      expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: 18 })
      )
    })
  })

  it('does not change other settings when updating one', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    const originalTemp = result.current.settings.temperature

    act(() => {
      result.current.updateSetting('fontSize', 14)
    })

    expect(result.current.settings.temperature).toBe(originalTemp)
  })
})

// ── updateSettings (batch) ────────────────────────────────────────────────────

describe('useSettings — updateSettings', () => {
  it('updates multiple settings at once', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.updateSettings({ fontSize: 17, temperature: 0.9, temperaturePreset: 'creative' })
    })

    expect(result.current.settings.fontSize).toBe(17)
    expect(result.current.settings.temperature).toBe(0.9)
    expect(result.current.settings.temperaturePreset).toBe('creative')
  })
})

// ── resetSettings ─────────────────────────────────────────────────────────────

describe('useSettings — resetSettings', () => {
  it('restores all settings to defaults', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    // First change something
    act(() => {
      result.current.updateSetting('fontSize', 18)
    })

    // Then reset
    act(() => {
      result.current.resetSettings()
    })

    expect(result.current.settings.fontSize).toBe(DEFAULT_SETTINGS.fontSize)
    expect(result.current.settings.temperature).toBe(DEFAULT_SETTINGS.temperature)
  })

  it('persists the reset via IPC', async () => {
    const { result } = renderHook(() => useSettings())
    await waitFor(() => expect(result.current.isLoaded).toBe(true))

    act(() => {
      result.current.resetSettings()
    })

    await waitFor(() => {
      expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(
        expect.objectContaining({ fontSize: DEFAULT_SETTINGS.fontSize })
      )
    })
  })
})
