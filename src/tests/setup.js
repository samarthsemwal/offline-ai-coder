/**
 * Test setup — src/tests/setup.js
 *
 * Runs before every test file.
 * - Imports @testing-library/jest-dom matchers (toBeInTheDocument, etc.)
 * - Mocks window.electronAPI so components that call it don't throw
 */
import '@testing-library/jest-dom'
import { vi } from 'vitest'

// ── Mock window.electronAPI globally ─────────────────────────────────────────
// All components/hooks access Electron IPC through this bridge.
// Individual tests can override specific methods as needed.
window.electronAPI = {
  platform: 'darwin',

  // Session storage
  listSessions: vi.fn().mockResolvedValue([]),
  loadSession: vi.fn().mockResolvedValue(null),
  saveSession: vi.fn().mockResolvedValue(true),
  deleteSession: vi.fn().mockResolvedValue(true),
  deleteAllSessions: vi.fn().mockResolvedValue(true),
  renameSession: vi.fn().mockResolvedValue(true),
  pinSession: vi.fn().mockResolvedValue(true),
  exportSession: vi.fn().mockResolvedValue(null),

  // Settings
  loadSettings: vi.fn().mockResolvedValue({}),
  saveSettings: vi.fn().mockResolvedValue(true),

  // File I/O
  openFileDialog: vi.fn().mockResolvedValue(null),
  readFile: vi.fn().mockResolvedValue({ content: '', name: 'test.js', extension: 'js' }),
  saveFileDialog: vi.fn().mockResolvedValue({ success: true }),

  // Shell
  openExternal: vi.fn().mockResolvedValue(undefined),

  // Ollama
  checkOllamaStatus: vi.fn().mockResolvedValue({ ok: true, models: [] }),

  // Stealth mode
  onStealthToggle: vi.fn().mockReturnValue(() => {}),

  // Prompt library
  loadCustomPrompts: vi.fn().mockResolvedValue([]),
  saveCustomPrompts: vi.fn().mockResolvedValue(true)
}

// ── Mock navigator.clipboard ──────────────────────────────────────────────────
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue('')
  }
})

// ── Suppress known React 18 act() warnings in tests ──────────────────────────
// These are noisy and expected in async component tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (args[0]?.includes?.('not wrapped in act')) return
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
