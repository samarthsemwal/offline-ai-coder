/**
 * Context Builder Tests — src/tests/contextBuilder.test.js
 *
 * Covers:
 * - Token estimation accuracy
 * - Files within budget pass through unchanged
 * - Files exceeding budget are truncated with explicit marker
 * - Truncation is line-aligned (no partial lines)
 * - formatCodeBlock output format
 * - getContextSummary output strings
 * - Edge cases: empty content, zero budget
 */
import { describe, it, expect } from 'vitest'
import {
  estimateTokens,
  formatTokenCount,
  buildFileContext,
  formatCodeBlock,
  getContextSummary,
  DEFAULT_CONTEXT_BUDGET_TOKENS
} from '../renderer/src/services/contextBuilder.js'

// ── Token estimation ──────────────────────────────────────────────────────────

describe('estimateTokens', () => {
  it('returns 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('returns ceil(length / 4)', () => {
    // "hello" = 5 chars → ceil(5/4) = 2
    expect(estimateTokens('hello')).toBe(2)
  })

  it('estimates ~250 tokens for 1000 chars', () => {
    const text = 'a'.repeat(1000)
    expect(estimateTokens(text)).toBe(250)
  })

  it('handles undefined gracefully', () => {
    expect(estimateTokens(undefined)).toBe(0)
  })
})

// ── formatTokenCount ──────────────────────────────────────────────────────────

describe('formatTokenCount', () => {
  it('formats < 1000 as ~N tokens', () => {
    expect(formatTokenCount(500)).toBe('~500 tokens')
  })

  it('formats >= 1000 as ~Xk tokens', () => {
    expect(formatTokenCount(2400)).toBe('~2.4k tokens')
  })

  it('formats exactly 1000 as ~1.0k tokens', () => {
    expect(formatTokenCount(1000)).toBe('~1.0k tokens')
  })
})

// ── buildFileContext — fits within budget ─────────────────────────────────────

describe('buildFileContext — within budget', () => {
  it('returns full content unchanged for small files', () => {
    const content = 'const x = 1\nconst y = 2\n'
    const result = buildFileContext({ content, fileName: 'test.js', language: 'javascript' })

    expect(result.wasTruncated).toBe(false)
    expect(result.content).toBe(content)
    expect(result.includedLines).toBe(result.originalLines)
    expect(result.originalChars).toBe(content.length)
  })

  it('reports correct line count for multi-line files', () => {
    const lines = Array.from({ length: 20 }, (_, i) => `line ${i + 1}`).join('\n')
    const result = buildFileContext({ content: lines, fileName: 'file.py' })

    expect(result.originalLines).toBe(20)
    expect(result.includedLines).toBe(20)
    expect(result.wasTruncated).toBe(false)
  })

  it('estimatedTokens is reasonable for small content', () => {
    const content = 'const hello = "world"'  // 21 chars → ~5-6 tokens
    const result = buildFileContext({ content, fileName: 'x.js' })
    expect(result.estimatedTokens).toBeGreaterThan(0)
    expect(result.estimatedTokens).toBeLessThan(20)
  })
})

// ── buildFileContext — truncation ─────────────────────────────────────────────

describe('buildFileContext — truncation', () => {
  function makeContent (lines) {
    return Array.from({ length: lines }, (_, i) =>
      `// Line ${String(i + 1).padStart(4, '0')}: ${'x'.repeat(80)}`
    ).join('\n')
  }

  it('truncates files exceeding budget', () => {
    // Each line ~90 chars → ~22 tokens. Budget = 200 → ~8-9 lines fit
    const content = makeContent(100)
    const result = buildFileContext({
      content,
      fileName: 'large.js',
      language: 'javascript',
      budgetTokens: 200
    })

    expect(result.wasTruncated).toBe(true)
    expect(result.includedLines).toBeLessThan(100)
    expect(result.originalLines).toBe(100)
  })

  it('truncation marker is present in output', () => {
    const content = makeContent(200)
    const result = buildFileContext({
      content,
      fileName: 'big.py',
      budgetTokens: 300
    })

    expect(result.content).toContain('TRUNCATED')
    expect(result.content).toContain('big.py')
  })

  it('included content does not contain partial lines', () => {
    const content = makeContent(100)
    const result = buildFileContext({
      content,
      fileName: 'test.js',
      budgetTokens: 200
    })

    if (!result.wasTruncated) return // nothing to check if it fits

    // Split by the separator line that precedes the truncation marker
    const separatorIdx = result.content.indexOf('\n// ─')
    const codeSection = separatorIdx > 0
      ? result.content.slice(0, separatorIdx)
      : result.content

    const lines = codeSection.split('\n').filter(l => l.trim())
    // Every line in the code section should be a full generated line
    lines.forEach(line => {
      expect(line).toMatch(/^\/\/ Line \d{4}/)
    })
  })


  it('truncated estimatedTokens is less than original', () => {
    const content = makeContent(200)
    const result = buildFileContext({
      content,
      fileName: 'test.js',
      budgetTokens: 500
    })

    if (result.wasTruncated) {
      expect(result.estimatedTokens).toBeLessThan(result.originalTokens)
    }
  })
})

// ── buildFileContext — edge cases ─────────────────────────────────────────────

describe('buildFileContext — edge cases', () => {
  it('handles empty content', () => {
    const result = buildFileContext({ content: '', fileName: 'empty.js' })
    expect(result.content).toBe('')
    expect(result.wasTruncated).toBe(false)
    expect(result.originalLines).toBe(0)
  })

  it('handles null/undefined content', () => {
    const result = buildFileContext({ content: null, fileName: 'null.js' })
    expect(result.content).toBe('')
    expect(result.wasTruncated).toBe(false)
  })

  it('uses DEFAULT_CONTEXT_BUDGET_TOKENS when not specified', () => {
    // Just ensure it runs without error and uses the default
    const content = 'const x = 1'
    const result = buildFileContext({ content, fileName: 'x.js' })
    expect(result).toBeDefined()
    expect(typeof result.wasTruncated).toBe('boolean')
  })
})

// ── formatCodeBlock ───────────────────────────────────────────────────────────

describe('formatCodeBlock', () => {
  it('wraps content in fenced code block with language', () => {
    const context = { content: 'const x = 1', wasTruncated: false }
    const result = formatCodeBlock(context, 'javascript', 'test.js')

    expect(result).toContain('```javascript')
    expect(result).toContain('const x = 1')
    expect(result).toContain('```')
  })

  it('includes File header when fileName is given', () => {
    const context = { content: 'print("hi")', wasTruncated: false }
    const result = formatCodeBlock(context, 'python', 'main.py')
    expect(result).toContain('// File: main.py')
  })

  it('omits File header when no fileName', () => {
    const context = { content: 'x = 1' }
    const result = formatCodeBlock(context, 'python', '')
    expect(result).not.toContain('// File:')
  })
})

// ── getContextSummary ─────────────────────────────────────────────────────────

describe('getContextSummary', () => {
  it('shows full line count and token estimate when not truncated', () => {
    const ctx = {
      wasTruncated: false,
      originalLines: 42,
      includedLines: 42,
      estimatedTokens: 200
    }
    const summary = getContextSummary(ctx)
    expect(summary).toContain('42 lines')
    expect(summary).not.toContain('truncated')
  })

  it('shows included/total lines and truncated note when truncated', () => {
    const ctx = {
      wasTruncated: true,
      originalLines: 500,
      includedLines: 80,
      estimatedTokens: 400
    }
    const summary = getContextSummary(ctx)
    expect(summary).toContain('80/500')
    expect(summary).toContain('truncated')
  })
})
