/**
 * useOllama Hook — src/renderer/src/hooks/useOllama.js
 *
 * Manages Ollama connection state and model list.
 * Polls the connection status every CONNECTION_POLL_INTERVAL_MS.
 * Exposes model selection state so any component can read or change the active model.
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { checkConnection } from '../services/ollamaService.js'
import { CONNECTION_POLL_INTERVAL_MS, DEFAULT_MODEL } from '../config.js'

/**
 * @returns {{
 *   connected: boolean,
 *   models: Array<{name: string}>,
 *   selectedModel: string,
 *   setSelectedModel: Function,
 *   refreshModels: Function,
 *   isLoading: boolean
 * }}
 */
export function useOllama () {
  const [connected, setConnected] = useState(false)
  const [models, setModels] = useState([])
  const [selectedModel, setSelectedModel] = useState(DEFAULT_MODEL)
  const [isLoading, setIsLoading] = useState(true)
  const intervalRef = useRef(null)

  const refresh = useCallback(async () => {
    const result = await checkConnection()
    setConnected(result.ok)
    if (result.ok && result.models.length > 0) {
      setModels(result.models)
      // Keep selected model if it still exists, else fall back to first available
      setSelectedModel(prev => {
        const exists = result.models.some(m => m.name === prev)
        return exists ? prev : (result.models[0]?.name ?? DEFAULT_MODEL)
      })
    }
    setIsLoading(false)
  }, [])

  // Initial check + set up polling interval
  useEffect(() => {
    refresh()
    intervalRef.current = setInterval(refresh, CONNECTION_POLL_INTERVAL_MS)
    return () => clearInterval(intervalRef.current)
  }, [refresh])

  return { connected, models, selectedModel, setSelectedModel, refreshModels: refresh, isLoading }
}
