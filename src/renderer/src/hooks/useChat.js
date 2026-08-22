/**
 * useChat Hook — src/renderer/src/hooks/useChat.js
 *
 * Core chat state management:
 * - Maintains the messages array for the current session
 * - Handles streaming responses (token by token)
 * - Auto-saves the session to disk after each complete response
 * - Manages abort controller for "stop generating" functionality
 * - Supports: deleteMessage, regenerateMessage, retryLastMessage
 */

import { useState, useCallback, useRef } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { streamChat } from '../services/ollamaService.js'
import { saveSession } from '../services/storageService.js'
import { SESSION_TITLE_MAX_LENGTH } from '../config.js'

/**
 * @param {Object} params
 * @param {string}   params.selectedModel     - Currently selected Ollama model name
 * @param {Function} params.onSessionSaved    - Called with updated session metadata after each save
 * @param {number}   [params.temperature]     - Sampling temperature (from settings, default 0.2)
 * @param {string}   [params.systemPrompt]    - System prompt override from settings
 */
export function useChat ({ selectedModel, onSessionSaved, temperature = 0.2, systemPrompt }) {
  const [messages, setMessages] = useState([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const [currentSession, setCurrentSession] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)

  const abortControllerRef = useRef(null)

  // ── Session Helpers ─────────────────────────────────────────────────────────

  function deriveTitle (firstMessage) {
    const text = firstMessage?.content ?? 'New Chat'
    return text.length > SESSION_TITLE_MAX_LENGTH
      ? text.slice(0, SESSION_TITLE_MAX_LENGTH) + '…'
      : text
  }

  const persistSession = useCallback(async (updatedMessages, session) => {
    const sessionToSave = session ?? {
      id: uuidv4(),
      title: deriveTitle(updatedMessages.find(m => m.role === 'user')),
      createdAt: new Date().toISOString(),
      model: selectedModel,
      pinned: false
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

  // ── Core Stream Executor ────────────────────────────────────────────────────

  /**
   * Internal: run a streaming chat request given a messages array.
   * Used by sendMessage and regenerateMessage.
   * @param {Array}  chatMessages   - Full messages array (including new user message)
   * @param {Array}  messagesAfterUser - Messages as they should appear in state when streaming starts
   * @param {Object} sessionRef     - Current session reference
   */
  const executeStream = useCallback(async (chatMessages, messagesAfterUser, sessionRef) => {
    abortControllerRef.current = new AbortController()
    setIsStreaming(true)
    setStreamingContent('')
    setErrorMessage(null)

    const chatHistory = chatMessages.map(({ role, content }) => ({ role, content }))
    let accumulatedContent = ''
    const responseStartTime = Date.now()

    await streamChat({
      model: selectedModel,
      messages: chatHistory,
      signal: abortControllerRef.current.signal,
      temperature,
      systemPrompt,

      onToken: (token) => {
        accumulatedContent += token
        setStreamingContent(accumulatedContent)
      },

      onDone: async () => {
        const responseTimeMs = Date.now() - responseStartTime
        const assistantMessage = {
          id: uuidv4(),
          role: 'assistant',
          content: accumulatedContent,
          timestamp: new Date().toISOString(),
          responseTimeMs
        }
        const finalMessages = [...messagesAfterUser, assistantMessage]
        setMessages(finalMessages)
        setStreamingContent('')
        setIsStreaming(false)

        const saved = await persistSession(finalMessages, sessionRef)
        if (!sessionRef) setCurrentSession(saved)
        else setCurrentSession(prev => ({ ...prev, updatedAt: saved.updatedAt }))
      },

      onError: (err) => {
        setIsStreaming(false)
        setStreamingContent('')
        setErrorMessage(err.message)
      }
    })
  }, [selectedModel, temperature, systemPrompt, persistSession])

  // ── Send Message ────────────────────────────────────────────────────────────

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isStreaming) return

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date().toISOString()
    }

    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)

    await executeStream(updatedMessages, updatedMessages, currentSession)
  }, [messages, isStreaming, currentSession, executeStream])

  // ── Regenerate Message ──────────────────────────────────────────────────────

  /**
   * Regenerate the AI response for a given assistant message.
   * Finds the preceding user message, re-sends history up to that point.
   * @param {string} assistantMessageId
   */
  const regenerateMessage = useCallback(async (assistantMessageId) => {
    if (isStreaming) return

    const msgIndex = messages.findIndex(m => m.id === assistantMessageId)
    if (msgIndex === -1 || messages[msgIndex].role !== 'assistant') return

    // History to send: everything up to (but not including) the assistant message
    const historyToSend = messages.slice(0, msgIndex)
    // Messages shown in UI during streaming: history without the old assistant msg
    const messagesBeforeAssistant = messages.slice(0, msgIndex)

    setMessages(messagesBeforeAssistant)

    await executeStream(historyToSend, messagesBeforeAssistant, currentSession)
  }, [messages, isStreaming, currentSession, executeStream])

  // ── Retry Last Message ──────────────────────────────────────────────────────

  /**
   * Retry after an error: re-send the last user message.
   */
  const retryLastMessage = useCallback(async () => {
    if (isStreaming) return
    const lastUser = [...messages].reverse().find(m => m.role === 'user')
    if (!lastUser) return

    const lastUserIndex = messages.lastIndexOf(messages.find(m => m.id === lastUser.id))
    const historyToSend = messages.slice(0, lastUserIndex + 1)

    setMessages(historyToSend)
    setErrorMessage(null)

    await executeStream(historyToSend, historyToSend, currentSession)
  }, [messages, isStreaming, currentSession, executeStream])

  // ── Delete Message ──────────────────────────────────────────────────────────

  /**
   * Remove a single message from the conversation and re-persist.
   * @param {string} messageId
   */
  const deleteMessage = useCallback(async (messageId) => {
    if (isStreaming) return
    const updated = messages.filter(m => m.id !== messageId)
    setMessages(updated)
    if (currentSession) {
      await persistSession(updated, currentSession)
    }
  }, [messages, isStreaming, currentSession, persistSession])

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
    regenerateMessage,
    retryLastMessage,
    deleteMessage,
    errorMessage,
    clearError: () => setErrorMessage(null)
  }
}
