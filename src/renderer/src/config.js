/**
 * App-wide configuration — src/renderer/src/config.js  (CodeLoom)
 *
 * All configurable values live here. No magic strings scattered in the codebase.
 */

/** Base URL for the local Ollama instance */
export const OLLAMA_HOST = 'http://localhost:11434'

/** Default model to use when the app first starts */
export const DEFAULT_MODEL = 'qwen2.5-coder:7b'

/** How often (ms) to poll Ollama for connection status in the header */
export const CONNECTION_POLL_INTERVAL_MS = 5000

/** Maximum message length for the session list title */
export const SESSION_TITLE_MAX_LENGTH = 60

/** Application metadata */
export const APP_NAME = 'CodeLoom'
export const APP_TAGLINE = 'Private Local AI Coding Assistant'

/**
 * System prompt injected at the start of every conversation.
 * Users can override this in Settings → AI.
 */
export const SYSTEM_PROMPT = `You are CodeLoom, an expert AI coding assistant running entirely on the user's local machine via Ollama. You have deep knowledge of software engineering, algorithms, data structures, and multiple programming languages.

Your primary focus is helping with:
- Code explanation, debugging, refactoring, and optimization
- Algorithm analysis and complexity (Big-O notation)
- Code review with specific, actionable feedback
- Writing tests, documentation, and technical content
- Software architecture and design patterns

Guidelines:
- Be precise and technical. Assume the user is a developer.
- For code, always include inline comments for non-obvious logic.
- When analyzing complexity, explain the reasoning (not just the result).
- For code review, categorize issues by severity (Critical/High/Medium/Low).
- If you are uncertain about something, say so clearly instead of guessing.
- Keep responses concise but complete — don't pad unnecessarily.
- Use code blocks with the correct language identifier for all code samples.`

/** Quick action prompts shown on the home screen (fallback if none typed) */
export const QUICK_PROMPTS = [
  'Explain how binary search works with a Python example and complexity analysis',
  'Review this code and identify any bugs or performance issues',
  'Write unit tests for a function that validates email addresses',
  'Explain the difference between async/await and Promises in JavaScript',
  'Optimize this O(n²) algorithm to O(n log n)',
  'Explain the SOLID principles with a concrete code example'
]
