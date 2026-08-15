/**
 * useChat Hook — src/renderer/src/hooks/useChat.js
 *
 * Core chat state management:
 * - Maintains the messages array for the current session
 * - Handles streaming responses (token by token)
 * - Auto-saves the session to disk after each complete response
 * - Manages abort controller for "stop generating" functionality
 */

import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { streamChat } from '../services/ollamaService.js'
import { saveSession } from '../services/storageService.js'
import { SESSION_TITLE_MAX_LENGTH } from '../config.js'

/**
 * @param {Object} params
 * @param {string} params.selectedModel       - Currently selected Ollama model name
 * @param {Function} params.onSessionSaved    - Called with updated session metadata after each save
 *
 * @returns {{
 *   messages: Array,
 *   isStreaming: boolean,
 *   streamingContent: string,
 *   currentSession: Object|null,
 *   sendMessage: Function,
 *   newChat: Function,
 *   loadSessionData: Function,
 *   abortStream: Function,
 *   errorMessage: string|null,
 *   clearError: Function
 * }}
 */
export function useChat ({ selectedModel, onSessionSaved }) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [currentSession, setCurrentSession] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  // AbortController ref — allows cancelling an in-flight stream
  const abortControllerRef = useRef(null)

  // ── Session Helpers ─────────────────────────────────────────────────────────

  /**
   * Derive a human-readable title from the first user message.
   * Truncates at SESSION_TITLE_MAX_LENGTH characters.
   */
  function deriveTitle (firstMessage) {
    const text = firstMessage?.content ?? 'New Chat'
    return text.length > SESSION_TITLE_MAX_LENGTH
      ? text.slice(0, SESSION_TITLE_MAX_LENGTH) + '…'
      : text
  }

  /**
   * Persist the current session to disk.
   * Creates a new session object if `currentSession` is null.
   */
  const persistSession = useCallback(async (updatedMessages, session) => {
    const sessionToSave = session ?? {
      id: uuidv4(),
      title: deriveTitle(updatedMessages.find(m => m.role === 'user')),
      createdAt: new Date().toISOString(),
      model: selectedModel
    }

    const fullSession = {
      ...sessionToSave,
      updatedAt: new Date().toISOString(),
      messages: updatedMessages
    }

    await saveSession(fullSession)
    onSessionSaved?.(fullSession)
    return fullSession
  }, [selectedModel, onSessionSaved])

  // ── Send Message ────────────────────────────────────────────────────────────

  /**
   * Send a user message and stream the assistant's response.
   * @param {string} content - The user's message text
   */
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isStreaming) return

    setErrorMessage(null)

    // Create a new message object for the user
    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    // Optimistically add user message to UI
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    // Set up abort controller for this request
    abortControllerRef.current = new AbortController()

    setIsStreaming(true)
    setStreamingContent('')

    // Build the conversation payload (role + content only, no extra fields)
    const chatHistory = updatedMessages.map(({ role, content }) => ({ role, content }))

    let accumulatedContent = ''
    const responseStartTime = Date.now() // ⏱️ Track response time

    await streamChat({
      model: selectedModel,
      messages: chatHistory,
      signal: abortControllerRef.current.signal,

      onToken: (token) => {
        accumulatedContent += token
        setStreamingContent(accumulatedContent)
      },

      onDone: async () => {
        const responseTimeMs = Date.now() - responseStartTime
        // Replace the streaming placeholder with the final assistant message
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date().toISOString(),
          responseTimeMs // ⏱️ Store how long the response took
        }
        const finalMessages = [...updatedMessages, assistantMessage]
        setMessages(finalMessages)
        setStreamingContent('')
        setIsStreaming(false)

        // Persist session to disk
        const saved = await persistSession(finalMessages, currentSession)
        if (!currentSession) setCurrentSession(saved)
        else setCurrentSession(prev => ({ ...prev, updatedAt: saved.updatedAt }))
      },

      onError: (err) => {
        setIsStreaming(false)
        setStreamingContent('')
        setErrorMessage(err.message)
      }
    })
  }, [messages, isStreaming, selectedModel, currentSession, persistSession])

  // ── Abort Stream ─────────────────────────────────────────────────────────────

  const abortStream = useCallback(() => {
    abortControllerRef.current?.abort()
    setIsStreaming(false)
    setStreamingContent('')
  }, [])

  // ── New Chat ──────────────────────────────────────────────────────────────────

  const newChat = useCallback(() => {
    abortControllerRef.current?.abort()
    setMessages([])
    setStreamingContent('')
    setIsStreaming(false)
    setCurrentSession(null)
    setErrorMessage(null)
  }, [])

  // ── Load Session ─────────────────────────────────────────────────────────────

  /**
   * Restore a session from disk into the chat state.
   * @param {Object} session - Full session object with messages array
   */
  const loadSessionData = useCallback((session) => {
    abortControllerRef.current?.abort()
    setMessages(session.messages ?? [])
    setStreamingContent('')
    setIsStreaming(false)
    setCurrentSession(session)
    setErrorMessage(null)
  }, [])

  return {
    messages,
    isStreaming,
    streamingContent,
    currentSession,
    sendMessage,
    newChat,
    loadSessionData,
    abortStream,
    errorMessage,
    clearError: () => setErrorMessage(null)
  }
}
