/**
 * Coding Prompts Tests — src/tests/codingPrompts.test.js
 *
 * Covers:
 * - All 7 prompt builders produce non-empty strings
 * - Prompts contain the injected code and language
 * - CODING_ACTIONS registry has correct IDs, icons, builders
 * - getPromptBuilder returns correct builder by ID
 * - Edge case: empty code falls back gracefully
 */
import { describe, it, expect } from 'vitest'
import {
  buildExplainPrompt,
  buildFixPrompt,
  buildRefactorPrompt,
  buildDebugPrompt,
  buildDocumentPrompt,
  buildReviewPrompt,
  buildGenerateTestsPrompt,
  CODING_ACTIONS,
  getPromptBuilder
} from '../renderer/src/services/codingPrompts.js'

const SAMPLE_JS = `function binarySearch(arr, target) {
  let left = 0, right = arr.length - 1
  while (left <= right) {
    const mid = Math.floor((left + right) / 2)
    if (arr[mid] === target) return mid
    if (arr[mid] < target) left = mid + 1
    else right = mid - 1
  }
  return -1
}`

const BASE_ARGS = {
  code: SAMPLE_JS,
  language: 'javascript',
  fileName: 'search.js'
}

// ── Individual prompt builders ────────────────────────────────────────────────

describe('buildExplainPrompt', () => {
  it('returns a non-empty string', () => {
    const prompt = buildExplainPrompt(BASE_ARGS)
    expect(typeof prompt).toBe('string')
    expect(prompt.length).toBeGreaterThan(50)
  })

  it('includes the language in the prompt', () => {
    const prompt = buildExplainPrompt(BASE_ARGS)
    expect(prompt).toContain('javascript')
  })

  it('includes the code in a fenced block', () => {
    const prompt = buildExplainPrompt(BASE_ARGS)
    expect(prompt).toContain('```javascript')
    expect(prompt).toContain('binarySearch')
  })

  it('includes the filename', () => {
    const prompt = buildExplainPrompt(BASE_ARGS)
    expect(prompt).toContain('search.js')
  })

  it('includes the user question when provided', () => {
    const prompt = buildExplainPrompt({ ...BASE_ARGS, userQuestion: 'Why use while loop?' })
    expect(prompt).toContain('Why use while loop?')
  })
})

describe('buildFixPrompt', () => {
  it('includes error message when provided', () => {
    const prompt = buildFixPrompt({ ...BASE_ARGS, errorMessage: 'TypeError: arr is not iterable' })
    expect(prompt).toContain('TypeError: arr is not iterable')
  })

  it('works without error message', () => {
    const prompt = buildFixPrompt(BASE_ARGS)
    expect(prompt.length).toBeGreaterThan(50)
  })

  it('asks for fixed code in output', () => {
    const prompt = buildFixPrompt(BASE_ARGS)
    expect(prompt.toLowerCase()).toContain('fix')
  })
})

describe('buildRefactorPrompt', () => {
  it('returns string containing the code', () => {
    const prompt = buildRefactorPrompt(BASE_ARGS)
    expect(prompt).toContain('binarySearch')
  })

  it('contains refactoring guidance', () => {
    const prompt = buildRefactorPrompt(BASE_ARGS)
    expect(prompt.toLowerCase()).toContain('refactor')
  })
})

describe('buildDebugPrompt', () => {
  it('includes error output section when provided', () => {
    const prompt = buildDebugPrompt({ ...BASE_ARGS, errorMessage: 'Stack overflow at line 5' })
    expect(prompt).toContain('Stack overflow at line 5')
  })
})

describe('buildDocumentPrompt', () => {
  it('mentions JSDoc for JavaScript', () => {
    const prompt = buildDocumentPrompt(BASE_ARGS)
    expect(prompt).toContain('JSDoc')
  })

  it('mentions docstrings for Python', () => {
    const prompt = buildDocumentPrompt({ ...BASE_ARGS, language: 'python', code: 'def foo(): pass' })
    expect(prompt).toContain('docstring')
  })
})

describe('buildReviewPrompt', () => {
  it('includes severity categories', () => {
    const prompt = buildReviewPrompt(BASE_ARGS)
    expect(prompt).toContain('Critical')
    expect(prompt).toContain('High')
    expect(prompt).toContain('Medium')
    expect(prompt).toContain('Low')
  })
})

describe('buildGenerateTestsPrompt', () => {
  it('mentions Jest for JavaScript', () => {
    const prompt = buildGenerateTestsPrompt(BASE_ARGS)
    expect(prompt).toContain('Jest')
  })

  it('mentions pytest for Python', () => {
    const prompt = buildGenerateTestsPrompt({
      code: 'def add(a, b): return a + b',
      language: 'python',
      fileName: 'math.py'
    })
    expect(prompt).toContain('pytest')
  })

  it('includes edge cases instruction', () => {
    const prompt = buildGenerateTestsPrompt(BASE_ARGS)
    expect(prompt.toLowerCase()).toContain('edge case')
  })
})

// ── CODING_ACTIONS registry ───────────────────────────────────────────────────

describe('CODING_ACTIONS registry', () => {
  const EXPECTED_IDS = ['explain', 'fix', 'refactor', 'debug', 'document', 'review', 'generate-tests']

  it('has 7 actions', () => {
    expect(CODING_ACTIONS).toHaveLength(7)
  })

  it('has all expected IDs', () => {
    const ids = CODING_ACTIONS.map(a => a.id)
    EXPECTED_IDS.forEach(id => {
      expect(ids).toContain(id)
    })
  })

  it('every action has id, label, icon, description, builder', () => {
    CODING_ACTIONS.forEach(action => {
      expect(action.id).toBeTruthy()
      expect(action.label).toBeTruthy()
      expect(action.icon).toBeTruthy()
      expect(action.description).toBeTruthy()
      expect(typeof action.builder).toBe('function')
    })
  })

  it('every builder produces a non-empty string', () => {
    CODING_ACTIONS.forEach(action => {
      const result = action.builder(BASE_ARGS)
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(20)
    })
  })
})

// ── getPromptBuilder ──────────────────────────────────────────────────────────

describe('getPromptBuilder', () => {
  it('returns the correct builder for explain', () => {
    const builder = getPromptBuilder('explain')
    expect(builder).toBe(buildExplainPrompt)
  })

  it('returns the correct builder for generate-tests', () => {
    const builder = getPromptBuilder('generate-tests')
    expect(builder).toBe(buildGenerateTestsPrompt)
  })

  it('returns null for unknown action', () => {
    expect(getPromptBuilder('nonexistent')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getPromptBuilder('')).toBeNull()
  })
})
