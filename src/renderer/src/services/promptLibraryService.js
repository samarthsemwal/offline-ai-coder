/**
 * Prompt Library Service — src/renderer/src/services/promptLibraryService.js
 *
 * Manages built-in (read-only) and custom (user-saved) prompts.
 * Custom prompts are persisted via IPC to prompt-library.json in userData.
 */

import { v4 as uuidv4 } from 'uuid'

// ─── Built-in Prompts ─────────────────────────────────────────────────────────

export const BUILTIN_PROMPTS = [
  {
    id: 'builtin-explain-algo',
    category: 'Understanding',
    title: 'Explain Algorithm',
    template: 'Explain this algorithm step by step, including time and space complexity, with a worked example:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-explain-code',
    category: 'Understanding',
    title: 'Explain Code',
    template: 'Explain what this code does, how it works, and highlight any notable patterns or design decisions:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-optimize',
    category: 'Improvement',
    title: 'Optimize Code',
    template: 'Optimize this code for performance and readability. Explain what changes were made and why, including complexity improvements:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-security',
    category: 'Security',
    title: 'Find Security Vulnerabilities',
    template: 'Analyze this code for security vulnerabilities. For each issue found, provide: the vulnerability type, severity (Critical/High/Medium/Low), how it could be exploited, and how to fix it:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-tests',
    category: 'Testing',
    title: 'Generate Unit Tests',
    template: 'Generate comprehensive unit tests for this code. Cover: happy path, edge cases (empty, null, boundaries), and error conditions. Include mocking where needed:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-docs',
    category: 'Documentation',
    title: 'Generate Documentation',
    template: 'Generate comprehensive documentation for this code, including: file/module header, function/method docs (params, returns, throws), inline comments for complex logic, and usage examples:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-convert',
    category: 'Conversion',
    title: 'Convert Language',
    template: 'Convert this code to [TARGET_LANGUAGE]. Preserve all logic exactly, use idiomatic patterns for the target language, and explain any significant differences:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-refactor',
    category: 'Improvement',
    title: 'Refactor Code',
    template: 'Refactor this code to improve readability, maintainability, and best practices. Preserve existing functionality. List what was changed and why:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-readme',
    category: 'Documentation',
    title: 'Create README',
    template: 'Create a comprehensive README.md for this project/code. Include: overview, features, installation, usage with examples, API reference if applicable, and contributing guidelines:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-debug',
    category: 'Debugging',
    title: 'Debug Error',
    template: 'Debug this error. Explain: what the error means, the root cause, step-by-step how to diagnose it, the fix, and how to prevent it in future:\n\nError:\n```\n[paste error here]\n```\n\nCode:\n',
    isBuiltin: true
  },
  {
    id: 'builtin-complexity',
    category: 'Understanding',
    title: 'Analyze Complexity',
    template: 'Analyze the time and space complexity of this code. For each function/method: provide Big-O notation, explain the reasoning, identify the bottleneck, and suggest optimizations:\n\n',
    isBuiltin: true
  },
  {
    id: 'builtin-code-review',
    category: 'Review',
    title: 'Code Review',
    template: 'Perform a thorough code review. Categorize issues by severity (Critical/High/Medium/Low). Cover: bugs, security, performance, maintainability, and best practices:\n\n',
    isBuiltin: true
  }
]

// Group built-ins by category for display
export function groupBuiltinsByCategory () {
  const groups = {}
  for (const prompt of BUILTIN_PROMPTS) {
    if (!groups[prompt.category]) groups[prompt.category] = []
    groups[prompt.category].push(prompt)
  }
  return groups
}

// ─── Custom Prompt CRUD ───────────────────────────────────────────────────────

/**
 * Load custom prompts from disk via IPC.
 * @returns {Promise<Array>}
 */
export async function loadCustomPrompts () {
  try {
    const prompts = await window.electronAPI.loadCustomPrompts()
    return Array.isArray(prompts) ? prompts : []
  } catch {
    return []
  }
}

/**
 * Save the full custom prompts array to disk.
 * @param {Array} prompts
 * @returns {Promise<boolean>}
 */
async function persistCustomPrompts (prompts) {
  try {
    return await window.electronAPI.saveCustomPrompts(prompts)
  } catch {
    return false
  }
}

/**
 * Create a new custom prompt.
 * @param {{ title: string, template: string, category?: string }} data
 * @param {Array} existingCustom
 * @returns {Promise<Array>} Updated custom prompts array
 */
export async function addCustomPrompt (data, existingCustom) {
  const newPrompt = {
    id: uuidv4(),
    category: data.category || 'Custom',
    title: data.title.trim(),
    template: data.template,
    isBuiltin: false,
    createdAt: new Date().toISOString()
  }
  const updated = [...existingCustom, newPrompt]
  await persistCustomPrompts(updated)
  return updated
}

/**
 * Update an existing custom prompt.
 * @param {string} id
 * @param {{ title?: string, template?: string, category?: string }} updates
 * @param {Array} existingCustom
 * @returns {Promise<Array>}
 */
export async function updateCustomPrompt (id, updates, existingCustom) {
  const updated = existingCustom.map(p =>
    p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
  )
  await persistCustomPrompts(updated)
  return updated
}

/**
 * Delete a custom prompt by ID (cannot delete built-ins).
 * @param {string} id
 * @param {Array} existingCustom
 * @returns {Promise<Array>}
 */
export async function deleteCustomPrompt (id, existingCustom) {
  const updated = existingCustom.filter(p => p.id !== id)
  await persistCustomPrompts(updated)
  return updated
}
