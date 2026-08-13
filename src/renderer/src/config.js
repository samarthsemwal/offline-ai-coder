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
export const SYSTEM_PROMPT = `You are an expert coding assistant and DSA (Data Structures & Algorithms) tutor. 
You provide clear, well-commented code examples, explain time and space complexity, 
and help debug and optimize code. Format code with proper syntax highlighting.
When explaining algorithms, walk through examples step by step.`

/** Example prompts shown on the empty state welcome screen */
export const EXAMPLE_PROMPTS = [
  'Explain how binary search works with a Python example',
  'Write a function to detect a cycle in a linked list',
  'Optimize this O(n²) code to O(n log n)',
  'Explain dynamic programming with the coin change problem',
  'Review my code and suggest improvements',
  'Compare merge sort vs quicksort with complexity analysis'
]
