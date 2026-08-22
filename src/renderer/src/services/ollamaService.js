/**
 * Ollama Service — src/renderer/src/services/ollamaService.js
 *
 * All communication with the local Ollama REST API lives here.
 * The renderer calls this service directly via `fetch` — no proxy through the main process.
 *
 * Key design: streaming responses are parsed as NDJSON (newline-delimited JSON).
 * Ollama sends one JSON object per line; we buffer incomplete lines between reads.
 */

import { OLLAMA_HOST, SYSTEM_PROMPT } from '../config.js'

// ─── Connection Check ─────────────────────────────────────────────────────────

/**
 * Check if Ollama is running and fetch the list of installed models.
 *
 * @returns {Promise<{ ok: boolean, models: Array<{name: string, size: number}>, error?: string }>}
 */
export async function checkConnection () {
  try {
    const res = await fetch(`${OLLAMA_HOST}/api/tags`, {
      signal: AbortSignal.timeout(3000)  // fail fast if Ollama is not running
    })
    if (!res.ok) return { ok: false, models: [], error: `HTTP ${res.status}` }
    const data = await res.json()
    const models = (data.models || []).map(m => ({
      name: m.name,
      size: m.size,
      modifiedAt: m.modified_at,
      // Derive a human-readable size string
      sizeFormatted: m.size ? formatBytes(m.size) : null
    }))
    return { ok: true, models }
  } catch (err) {
    const isRefused = err.message?.includes('fetch') || err.name === 'TimeoutError'
    return {
      ok: false,
      models: [],
      error: isRefused ? 'connection_refused' : err.message
    }
  }
}

/**
 * Format bytes to human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes (bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`
}

// ─── Chat Streaming ───────────────────────────────────────────────────────────

/**
 * Send a chat message to Ollama with streaming enabled.
 * Calls `onToken` for each text chunk as it arrives (for the typing effect).
 * Calls `onDone` when the stream completes.
 * Calls `onError` on any failure.
 *
 * @param {Object} params
 * @param {string}   params.model           - Model name e.g. "qwen2.5-coder:7b"
 * @param {Array}    params.messages        - Full conversation history [{role, content}]
 * @param {Function} params.onToken         - Called with each text chunk: (text: string) => void
 * @param {Function} params.onDone          - Called when streaming is complete: () => void
 * @param {Function} params.onError         - Called on error: (error: {type, message}) => void
 * @param {AbortSignal} params.signal       - AbortController signal for cancellation
 * @param {number}   [params.temperature]   - Sampling temperature (0.0–2.0, default 0.2)
 * @param {string}   [params.systemPrompt]  - System prompt override (falls back to config default)
 */
export async function streamChat ({
  model,
  messages,
  onToken,
  onDone,
  onError,
  signal,
  temperature = 0.2,
  systemPrompt
}) {
  // Prepend system prompt as the first message if not already there
  const activeSystemPrompt = systemPrompt || SYSTEM_PROMPT
  const fullMessages = messages[0]?.role === 'system'
    ? messages
    : [{ role: 'system', content: activeSystemPrompt }, ...messages]

  let response
  try {
    response = await fetch(`${OLLAMA_HOST}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        messages: fullMessages,
        stream: true,
        options: {
          temperature: Math.max(0, Math.min(2, temperature)),  // clamp 0–2
          top_p: 0.9
        }
      }),
      signal
    })
  } catch (err) {
    if (err.name === 'AbortError') return  // user cancelled — silently exit
    onError({
      type: 'connection_refused',
      message: 'Cannot reach Ollama. Make sure it is running on localhost:11434.'
    })
    return
  }

  if (!response.ok) {
    const body = await response.text().catch(() => '')
    const isModelNotFound = response.status === 404 || body.includes('not found')
    onError({
      type: isModelNotFound ? 'model_not_found' : 'http_error',
      message: isModelNotFound
        ? `Model "${model}" is not installed. Pull it first via Add Model.`
        : `Ollama returned HTTP ${response.status}: ${body}`
    })
    return
  }

  // ── NDJSON Stream Parsing ──────────────────────────────────────────────────
  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        if (buffer.trim()) tryParseChunk(buffer, onToken)
        onDone()
        break
      }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (line.trim()) tryParseChunk(line, onToken)
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    onError({
      type: 'stream_interrupted',
      message: 'The response stream was interrupted. Please try again.'
    })
  } finally {
    reader.releaseLock()
  }
}

/**
 * Parse a single NDJSON line from the Ollama stream.
 * @param {string} line
 * @param {Function} onToken
 */
function tryParseChunk (line, onToken) {
  try {
    const json = JSON.parse(line)
    const content = json.message?.content
    if (content) onToken(content)
  } catch {
    // Ignore malformed lines (can happen at stream boundaries)
  }
}

// ─── Model Pull ───────────────────────────────────────────────────────────────

/**
 * Pull (download) a model from the Ollama registry with live progress updates.
 *
 * @param {Object}   params
 * @param {string}   params.modelName    - e.g. "qwen2.5-coder:14b"
 * @param {Function} params.onProgress   - Called with { percent: number, status: string }
 * @param {Function} params.onDone       - Called when pull completes successfully
 * @param {Function} params.onError      - Called with error object on failure
 * @param {AbortSignal} params.signal    - For cancellation
 */
export async function pullModel ({ modelName, onProgress, onDone, onError, signal }) {
  let response
  try {
    response = await fetch(`${OLLAMA_HOST}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: modelName, stream: true }),
      signal
    })
  } catch (err) {
    if (err.name === 'AbortError') return
    onError({ type: 'connection_refused', message: 'Cannot reach Ollama to pull model.' })
    return
  }

  if (!response.ok) {
    onError({ type: 'http_error', message: `Pull failed with HTTP ${response.status}` })
    return
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) { onDone(); break }

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.trim()) continue
        try {
          const json = JSON.parse(line)
          const percent = json.total
            ? Math.round((json.completed / json.total) * 100)
            : null
          onProgress({ percent, status: json.status || '' })
          if (json.status === 'success') { onDone(); return }
        } catch {
          // Ignore parse errors on intermediate progress lines
        }
      }
    }
  } catch (err) {
    if (err.name === 'AbortError') return
    onError({ type: 'stream_interrupted', message: 'Model pull was interrupted.' })
  } finally {
    reader.releaseLock()
  }
}
