/**
 * vitest.config.js — CodeLoom unit test configuration
 *
 * Placed at project root; runs tests in jsdom environment so React
 * components and browser APIs (localStorage, etc.) are available.
 *
 * Only covers the renderer source — main/preload are Node-only and
 * tested via integration rather than unit tests.
 */
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.js'],
    include: ['src/tests/**/*.test.{js,jsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/renderer/src/services/**',
        'src/renderer/src/hooks/**',
        'src/renderer/src/components/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  }
})
