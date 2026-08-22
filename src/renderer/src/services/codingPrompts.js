/**
 * Coding Prompts — src/renderer/src/services/codingPrompts.js
 *
 * Action-specific prompt builders for the CodeLoom coding assistant.
 * Each builder takes structured context and returns a complete prompt string.
 *
 * Architecture:
 *   User Input + Code + File + Language + Action
 *     ↓
 *   Prompt Builder (action-specific template)
 *     ↓
 *   Complete prompt string → Ollama
 */

// ─── Internal Helpers ─────────────────────────────────────────────────────────

/**
 * Wrap code in a fenced block with language annotation.
 * @param {string} code
 * @param {string} language
 * @param {string} [fileName]
 */
function codeBlock (code, language = 'code', fileName = '') {
  const header = fileName ? `// File: ${fileName}\n` : ''
  return `\`\`\`${language}\n${header}${code.trim()}\n\`\`\``
}

/**
 * Detect test framework from language.
 * @param {string} language
 * @returns {{ framework: string, runner: string }}
 */
function inferTestFramework (language) {
  const map = {
    javascript: { framework: 'Jest', runner: 'npx jest' },
    jsx: { framework: 'React Testing Library + Jest', runner: 'npx jest' },
    typescript: { framework: 'Jest + ts-jest', runner: 'npx jest' },
    tsx: { framework: 'React Testing Library + Jest', runner: 'npx jest' },
    python: { framework: 'pytest', runner: 'pytest' },
    java: { framework: 'JUnit 5 + Mockito', runner: 'mvn test' },
    kotlin: { framework: 'JUnit 5 + MockK', runner: 'gradle test' },
    cpp: { framework: 'Google Test', runner: 'cmake --build . && ctest' },
    c: { framework: 'Unity Test Framework', runner: 'make test' },
    csharp: { framework: 'xUnit + Moq', runner: 'dotnet test' },
    ruby: { framework: 'RSpec', runner: 'bundle exec rspec' },
    go: { framework: 'testing (stdlib)', runner: 'go test ./...' },
    rust: { framework: 'built-in test module', runner: 'cargo test' },
    swift: { framework: 'XCTest', runner: 'swift test' },
    php: { framework: 'PHPUnit', runner: 'vendor/bin/phpunit' },
  }
  return map[language] || { framework: 'appropriate testing framework for ' + language, runner: 'run your test suite' }
}

// ─── Prompt Builders ──────────────────────────────────────────────────────────

/**
 * Explain Code prompt.
 * @param {{ code: string, language: string, fileName?: string, userQuestion?: string }}
 */
export function buildExplainPrompt ({ code, language, fileName = '', userQuestion = '' }) {
  const context = userQuestion ? `\nSpecific question: ${userQuestion}\n` : ''
  return `You are an expert ${language} developer. Explain the following code clearly and thoroughly.${context}

${codeBlock(code, language, fileName)}

Please cover:
1. **What it does** — the overall purpose and functionality
2. **How it works** — step-by-step walkthrough of the logic
3. **Key concepts** — any patterns, algorithms, or techniques used
4. **Time & Space Complexity** — if applicable (algorithms/data structures)
5. **Potential issues** — anything that could be improved or could go wrong

Be precise and educational. Use simple language where possible.`
}

/**
 * Fix Code prompt.
 * @param {{ code: string, language: string, fileName?: string, errorMessage?: string, userQuestion?: string }}
 */
export function buildFixPrompt ({ code, language, fileName = '', errorMessage = '', userQuestion = '' }) {
  const errorSection = errorMessage
    ? `\n**Error / Issue reported:**\n\`\`\`\n${errorMessage.trim()}\n\`\`\`\n`
    : ''
  const questionSection = userQuestion ? `\n**Additional context:** ${userQuestion}\n` : ''

  return `You are an expert ${language} developer and debugger. Analyze the following code and fix any issues.${errorSection}${questionSection}

${codeBlock(code, language, fileName)}

Respond with:
1. **Issues Found** — list each problem clearly
2. **Root Cause** — explain why each issue occurs
3. **Fixed Code** — provide the complete corrected code
4. **Explanation** — describe what was changed and why

Ensure the fixed code is complete, correct, and follows best practices for ${language}.`
}

/**
 * Refactor Code prompt.
 * @param {{ code: string, language: string, fileName?: string, userQuestion?: string }}
 */
export function buildRefactorPrompt ({ code, language, fileName = '', userQuestion = '' }) {
  const focus = userQuestion ? `\nRefactoring focus: ${userQuestion}\n` : ''
  return `You are an expert ${language} developer specializing in clean, maintainable code.${focus}

Refactor the following code to improve its quality:

${codeBlock(code, language, fileName)}

Respond with:
1. **Current Issues** — what makes the current code harder to maintain
2. **Refactoring Strategy** — what approach you're taking and why
3. **Refactored Code** — the complete improved version
4. **Changes Made** — bullet-point summary of what changed
5. **Benefits** — how the refactoring improves the code

Preserve the original functionality exactly. Apply ${language} idioms and best practices.`
}

/**
 * Debug Code prompt.
 * @param {{ code: string, language: string, fileName?: string, errorMessage?: string, userQuestion?: string }}
 */
export function buildDebugPrompt ({ code, language, fileName = '', errorMessage = '', userQuestion = '' }) {
  const errorSection = errorMessage
    ? `\n**Error output:**\n\`\`\`\n${errorMessage.trim()}\n\`\`\`\n`
    : ''
  const context = userQuestion ? `\n**Symptoms / Context:** ${userQuestion}\n` : ''

  return `You are an expert ${language} debugger. Analyze this code and help fix the problem.${errorSection}${context}

${codeBlock(code, language, fileName)}

Respond with:
1. **Error Analysis** — what the error means and where it originates
2. **Root Cause** — the exact line(s) and reason for the bug
3. **Debugging Steps** — how you would trace this systematically
4. **Fix** — the corrected code with highlighted changes
5. **Prevention** — how to avoid this class of bug in future

Be specific about line numbers and variable names.`
}

/**
 * Document Code prompt.
 * @param {{ code: string, language: string, fileName?: string }}
 */
export function buildDocumentPrompt ({ code, language, fileName = '' }) {
  const docStyle = {
    javascript: 'JSDoc',
    jsx: 'JSDoc',
    typescript: 'JSDoc/TSDoc',
    tsx: 'JSDoc/TSDoc',
    python: 'Google-style docstrings',
    java: 'Javadoc',
    kotlin: 'KDoc',
    swift: 'Swift documentation comments (///) ',
    go: 'Go doc comments',
    rust: 'Rustdoc (///)',
    cpp: 'Doxygen-style',
    c: 'Doxygen-style',
    ruby: 'YARD',
    php: 'PHPDoc',
    csharp: 'XML documentation comments',
  }[language] || 'appropriate documentation comments'

  return `You are a technical writer and expert ${language} developer. Add comprehensive documentation to the following code using ${docStyle} format.

${codeBlock(code, language, fileName)}

Generate:
1. **File/module header** — brief description of the file's purpose
2. **Function/method docs** — for every public function/method:
   - Description
   - @param / parameter types and descriptions
   - @returns / return type and description
   - @throws if applicable
   - Example usage where helpful
3. **Inline comments** — explain complex logic, non-obvious decisions, and algorithms
4. **Type annotations** — add/improve where relevant to the language

Return the complete documented version of the code. Do not change functionality.`
}

/**
 * Code Review prompt — returns structured severity-classified feedback.
 * @param {{ code: string, language: string, fileName?: string, userQuestion?: string }}
 */
export function buildReviewPrompt ({ code, language, fileName = '', userQuestion = '' }) {
  const focus = userQuestion ? `\nReview focus: ${userQuestion}\n` : ''
  return `You are a senior ${language} engineer conducting a thorough code review.${focus}

${codeBlock(code, language, fileName)}

Provide a structured code review in the following format:

## Summary
[Overall assessment in 2–3 sentences]

## Issues Found

### 🔴 Critical
[Issues that will cause bugs, crashes, or data loss — must fix]

### 🟠 High
[Significant problems: security, performance, correctness — should fix]

### 🟡 Medium
[Code quality, maintainability, unclear logic — recommended to fix]

### 🟢 Low
[Style, naming, minor improvements — nice to have]

## Security Concerns
[Any security vulnerabilities, injection risks, unsafe operations]

## Performance Concerns
[Algorithmic complexity, memory, I/O, unnecessary work]

## Maintainability
[Readability, duplication, coupling, testability]

## Suggested Improvements
[Concrete actionable suggestions]

## Improved Code
[Provide a corrected/improved version if there are Critical or High issues]

Be specific and cite line numbers where possible.`
}

/**
 * Generate Tests prompt — language-aware test generation.
 * @param {{ code: string, language: string, fileName?: string, userQuestion?: string }}
 */
export function buildGenerateTestsPrompt ({ code, language, fileName = '', userQuestion = '' }) {
  const { framework, runner } = inferTestFramework(language)
  const context = userQuestion ? `\nAdditional test requirements: ${userQuestion}\n` : ''

  return `You are an expert ${language} developer specializing in test-driven development. Generate comprehensive tests for the following code using ${framework}.${context}

${codeBlock(code, language, fileName)}

Respond with:

## Test Strategy
[Describe your testing approach: what you're testing and why]

## Generated Test Code
[Complete, runnable test file using ${framework}]

\`\`\`${language}
// Tests here
\`\`\`

## Edge Cases Covered
[Bullet list of edge cases and boundary conditions tested]

## Mocking Requirements
[Any mocks, stubs, or fixtures needed, and why]

## Running the Tests
\`\`\`bash
${runner}
\`\`\`

Make the tests realistic, meaningful, and cover:
- Happy path (normal input)
- Edge cases (empty, null, boundary values)
- Error conditions (invalid input, failures)
- Any async behavior if present`
}

// ─── Action Registry ──────────────────────────────────────────────────────────

/** All supported coding actions with metadata */
export const CODING_ACTIONS = [
  {
    id: 'explain',
    label: 'Explain',
    icon: '🔍',
    description: 'Understand what code does and how it works',
    builder: buildExplainPrompt
  },
  {
    id: 'fix',
    label: 'Fix',
    icon: '🔧',
    description: 'Find and fix bugs in the code',
    builder: buildFixPrompt
  },
  {
    id: 'refactor',
    label: 'Refactor',
    icon: '✨',
    description: 'Improve code quality and maintainability',
    builder: buildRefactorPrompt
  },
  {
    id: 'debug',
    label: 'Debug',
    icon: '🐛',
    description: 'Trace errors and diagnose problems',
    builder: buildDebugPrompt
  },
  {
    id: 'document',
    label: 'Document',
    icon: '📝',
    description: 'Generate docs, comments, and JSDoc/docstrings',
    builder: buildDocumentPrompt
  },
  {
    id: 'review',
    label: 'Review',
    icon: '🔎',
    description: 'Get structured code review with severity ratings',
    builder: buildReviewPrompt
  },
  {
    id: 'generate-tests',
    label: 'Generate Tests',
    icon: '🧪',
    description: 'Generate unit tests with edge cases',
    builder: buildGenerateTestsPrompt
  }
]

/**
 * Get a prompt builder by action ID.
 * @param {string} actionId
 * @returns {Function|null}
 */
export function getPromptBuilder (actionId) {
  return CODING_ACTIONS.find(a => a.id === actionId)?.builder ?? null
}
