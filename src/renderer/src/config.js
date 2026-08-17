/**
 * App-wide configuration — src/renderer/src/config.js
 *
 * All configurable values live here. No magic strings scattered in the codebase.
 * Change OLLAMA_HOST if Ollama runs on a different port or machine (e.g. remote dev).
 */

/** Base URL for the local Ollama instance */
export const OLLAMA_HOST = 'http://localhost:11434'

/** Default model to use when the app first starts */
export const DEFAULT_MODEL = 'qwen2.5-coder:7b'

/** How often (ms) to poll Ollama for connection status in the header */
export const CONNECTION_POLL_INTERVAL_MS = 5000

/** Maximum message length before we truncate in the session list title */
export const SESSION_TITLE_MAX_LENGTH = 60

/** System prompt injected at the start of every conversation */
export const SYSTEM_PROMPT = `You are a smart, all-rounder personal assistant.
You help with a wide range of tasks including:
- Coding & DSA: write clean, well-commented code and explain time/space complexity
- Writing: draft professional emails, letters, resumes, and documents
- Design & Productivity: suggest UI/UX ideas, workflows, and best practices
- Daily Life: cooking recipes, health tips, travel planning, finance advice
- General Knowledge: answer questions clearly and factually

Guidelines:
- Be concise but complete. Don't pad answers unnecessarily.
- For code, always add inline comments and mention Big-O complexity.
- For writing tasks, match the tone the user asks for (formal, casual, friendly).
- If unsure, say so honestly rather than guessing.`

/** Example prompts shown on the empty state welcome screen */
export const EXAMPLE_PROMPTS = [
  'Write a professional email to reschedule a meeting',
  'Explain binary search with a Python example and complexity',
  'Give me a healthy meal plan for a busy workday',
  'Write a cover letter for a software engineer role',
  'Optimize this O(n²) code to O(n log n)',
  'Suggest a 7-day budget travel plan for Manali'
]
