/**
 * Context Builder — src/renderer/src/services/contextBuilder.js
 *
 * Manages file content for AI prompts within a token budget.
 * This is a critical engineering layer — never silently truncate content.
 *
 * Token estimation: characters ÷ 4 (conservative approximation for English/code).
 * Real tokenization varies by model/tokenizer, so we use a conservative estimate
 * with a safety margin. This avoids silent context overflows.
 *
 * Architecture:
 *   File content
 *     ↓ estimateTokens()
 *     ↓ compare against budget
 *     ↓ truncate if needed (with clear marker)
 *     ↓ return { content, wasTruncated, stats }
 */

// ─── Constants ────────────────────────────────────────────────────────────────

/** Default context budget in tokens (conservative for 7B models via Ollama) */
export const DEFAULT_CONTEXT_BUDGET_TOKENS = 6000

/** Safety margin — keep actual usage below 90% of budget to leave room for prompt + response */
const BUDGET_SAFETY_FACTOR = 0.85

/** Characters per token estimate (conservative — real value is ~3.5–4.5 for code) */
const CHARS_PER_TOKEN = 4

// ─── Token Estimation ─────────────────────────────────────────────────────────

/**
 * Estimate token count from a text string.
 * Uses character count ÷ 4 with rounding up.
 * Conservative on purpose — better to slightly over-estimate than under.
 *
 * @param {string} text
 * @returns {number} Estimated token count
 */
export function estimateTokens (text = '') {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/**
 * Format an estimated token count for display.
 * @param {number} tokens
 * @returns {string} e.g. "~800 tokens" or "~2.4k tokens"
 */
export function formatTokenCount (tokens) {
  if (tokens >= 1000) return `~${(tokens / 1000).toFixed(1)}k tokens`
  return `~${tokens} tokens`
}

// ─── Core Context Builder ─────────────────────────────────────────────────────

/**
 * Prepare file content for inclusion in a prompt, respecting the token budget.
 *
 * @param {Object} params
 * @param {string}  params.content       - Raw file content
 * @param {string}  params.fileName      - File name (for truncation marker)
 * @param {string}  [params.language]    - Detected language
 * @param {number}  [params.budgetTokens] - Max tokens to use for this file
 *
 * @returns {{
 *   content: string,          // Content to include in prompt (may be truncated)
 *   wasTruncated: boolean,
 *   originalLines: number,
 *   includedLines: number,
 *   originalChars: number,
 *   includedChars: number,
 *   estimatedTokens: number,  // Tokens in the INCLUDED portion
 *   originalTokens: number,   // Tokens in the FULL file
 * }}
 */
export function buildFileContext ({
  content,
  fileName = 'file',
  language = 'text',
  budgetTokens = DEFAULT_CONTEXT_BUDGET_TOKENS
}) {
  if (!content || typeof content !== 'string') {
    return {
      content: '',
      wasTruncated: false,
      originalLines: 0,
      includedLines: 0,
      originalChars: 0,
      includedChars: 0,
      estimatedTokens: 0,
      originalTokens: 0
    }
  }

  const lines = content.split('\n')
  const originalLines = lines.length
  const originalChars = content.length
  const originalTokens = estimateTokens(content)

  // Apply safety factor to the budget
  const effectiveBudget = Math.floor(budgetTokens * BUDGET_SAFETY_FACTOR)
  const charBudget = effectiveBudget * CHARS_PER_TOKEN

  if (originalChars <= charBudget) {
    // Fits within budget — include everything
    return {
      content,
      wasTruncated: false,
      originalLines,
      includedLines: originalLines,
      originalChars,
      includedChars: originalChars,
      estimatedTokens: originalTokens,
      originalTokens
    }
  }

  // Needs truncation — include as many lines as fit within charBudget
  let accumulated = 0
  let lastLineIndex = 0
  for (let i = 0; i < lines.length; i++) {
    const lineLen = lines[i].length + 1  // +1 for newline
    if (accumulated + lineLen > charBudget) break
    accumulated += lineLen
    lastLineIndex = i
  }

  const truncationMarker = [
    '',
    '// ─────────────────────────────────────────────────────────',
    `// ⚠️  TRUNCATED — ${fileName} is too large for the current context budget.`,
    `//    Showing lines 1–${lastLineIndex + 1} of ${originalLines} total lines.`,
    `//    Approximately ${originalTokens.toLocaleString()} tokens in full file.`,
    `//    Adjust context budget in Settings → AI to include more content.`,
    '// ─────────────────────────────────────────────────────────'
  ].join('\n')

  const truncatedContent = lines.slice(0, lastLineIndex + 1).join('\n') + truncationMarker

  return {
    content: truncatedContent,
    wasTruncated: true,
    originalLines,
    includedLines: lastLineIndex + 1,
    originalChars,
    includedChars: accumulated,
    estimatedTokens: estimateTokens(truncatedContent),
    originalTokens
  }
}

// ─── Prompt Context Assembly ──────────────────────────────────────────────────

/**
 * Build the code context block for inclusion in an AI prompt.
 * Wraps content in a fenced code block with language tag.
 *
 * @param {Object} fileContext - Result from buildFileContext()
 * @param {string} language    - Language for the code fence
 * @param {string} fileName    - File name for the header comment
 * @returns {string}
 */
export function formatCodeBlock (fileContext, language = 'text', fileName = '') {
  const header = fileName ? `// File: ${fileName}\n` : ''
  return `\`\`\`${language}\n${header}${fileContext.content}\n\`\`\``
}

/**
 * Summarize context build result for UI display.
 * @param {Object} context - Result from buildFileContext()
 * @returns {string} Human-readable summary
 */
export function getContextSummary (context) {
  if (context.wasTruncated) {
    return `${context.includedLines}/${context.originalLines} lines · ${formatTokenCount(context.estimatedTokens)} (truncated)`
  }
  return `${context.originalLines} lines · ${formatTokenCount(context.estimatedTokens)}`
}
