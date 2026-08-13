/**
 * MarkdownRenderer — src/renderer/src/components/MarkdownRenderer.jsx
 *
 * Renders markdown content with:
 * - Full GFM (tables, strikethrough, etc.) via remark-gfm
 * - Syntax-highlighted code blocks via react-syntax-highlighter (oneDark theme)
 * - Copy button on each code block
 * - Language badge showing the detected language
 */
import { useState, memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import remarkGfm from 'remark-gfm'
import '../styles/chat.css'

// Customize the oneDark theme to match our app's background
const customTheme = {
  ...oneDark,
  'pre[class*="language-"]': {
    ...oneDark['pre[class*="language-"]'],
    background: '#0d1117',
    margin: 0,
    borderRadius: 0
  },
  'code[class*="language-"]': {
    ...oneDark['code[class*="language-"]'],
    background: 'transparent'
  }
}

/**
 * Code block with language badge and copy button.
 * Memoized to avoid re-rendering unchanged code blocks during streaming.
 */
const CodeBlock = memo(function CodeBlock ({ language, code }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy () {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API failed — fallback
      const el = document.createElement('textarea')
      el.value = code
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="code-block-wrapper">
      <div className="code-block-header">
        <span className="code-block-lang">{language || 'code'}</span>
        <button
          className={`btn-copy-code ${copied ? 'copied' : ''}`}
          onClick={handleCopy}
          title={copied ? 'Copied!' : 'Copy code'}
          aria-label={copied ? 'Copied to clipboard' : 'Copy code to clipboard'}
        >
          {copied ? '✓ Copied' : '⎘ Copy'}
        </button>
      </div>
      <SyntaxHighlighter
        style={customTheme}
        language={language || 'text'}
        PreTag="div"
        showLineNumbers={code.split('\n').length > 5}
        wrapLongLines={false}
        customStyle={{
          margin: 0,
          borderRadius: 0,
          fontSize: '13px',
          fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  )
})

/**
 * @param {Object} props
 * @param {string} props.content   - Markdown string to render
 * @param {boolean} props.isStreaming - Adds blinking cursor at the end while streaming
 */
export default function MarkdownRenderer ({ content, isStreaming = false }) {
  return (
    <div className={`markdown-body ${isStreaming ? 'streaming-cursor' : ''}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // ── Code blocks (fenced code with language) ────────────────────────
          code ({ node, inline, className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : ''
            const codeText = String(children).replace(/\n$/, '')

            if (!inline && (match || codeText.includes('\n'))) {
              return <CodeBlock language={language} code={codeText} />
            }

            // Inline code (backtick in text)
            return (
              <code className={className} {...props}>
                {children}
              </code>
            )
          },

          // ── Override pre to avoid double-wrapping ──────────────────────────
          pre ({ children }) {
            // Our CodeBlock already wraps in a div; strip the default <pre>
            return <>{children}</>
          }
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
