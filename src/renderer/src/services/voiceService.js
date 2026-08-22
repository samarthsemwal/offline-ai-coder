/**
 * Voice Service — src/renderer/src/services/voiceService.js
 *
 * 100% Offline speech recognition using Transformers.js (Whisper tiny.en).
 * No internet required after the first model download (~42 MB, one-time only).
 * Models are cached locally — subsequent app starts use the cached version.
 *
 * SWAP POINT: Implements the same interface as the original webkitSpeechRecognition
 * version. No other files need major changes.
 *
 * Interface: createVoiceInput({ onResult, onStart, onStop, onError, onModelStatus })
 * Returns:   { start(), stop(), isSupported(), preloadModel() }
 */

import { pipeline, env } from '@huggingface/transformers'

// ─── Whisper Model Config ─────────────────────────────────────────────────────
// Xenova/whisper-tiny.en is optimized and quantized (~39 MB), fast and lightweight
const MODEL_ID = 'Xenova/whisper-tiny.en'

// Cache model in app's local cache dir (persists across sessions)
env.allowLocalModels = false
env.useBrowserCache = true   // use IndexedDB cache — survives app restarts

// ─── Singleton Pipeline ──────────────────────────────────────────────────────

let whisperPipeline = null
let modelLoadPromise = null

/**
 * Loads Whisper model once and reuses it for the entire app session.
 * @param {Function} [onProgress] - called with { status, progress } during download
 */
async function getWhisperPipeline (onProgress) {
  if (whisperPipeline) return whisperPipeline
  if (modelLoadPromise) return modelLoadPromise

  modelLoadPromise = pipeline('automatic-speech-recognition', MODEL_ID, {
    progress_callback: onProgress,
    dtype: 'fp32'
  }).then(p => {
    whisperPipeline = p
    modelLoadPromise = null
    return p
  }).catch(err => {
    modelLoadPromise = null
    throw err
  })

  return modelLoadPromise
}

// ─── Audio Helpers ───────────────────────────────────────────────────────────

/**
 * Converts a Blob of recorded audio to a Float32Array at 16 kHz,
 * which is what Whisper expects.
 *
 * @param {Blob} audioBlob
 * @returns {Promise<Float32Array>}
 */
async function blobToFloat32 (audioBlob) {
  const arrayBuffer = await audioBlob.arrayBuffer()
  // Decode at 16 kHz — Whisper's required sample rate
  const audioCtx = new AudioContext({ sampleRate: 16000 })
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
  const float32 = audioBuffer.getChannelData(0) // mono channel
  await audioCtx.close()
  return float32
}

// ─── Public Factory ──────────────────────────────────────────────────────────

/**
 * Creates a voice input controller.
 *
 * @param {Object}   callbacks
 * @param {Function} callbacks.onResult      - (transcript: string, isFinal: boolean) => void
 * @param {Function} callbacks.onStart       - () => void — mic opened, recording started
 * @param {Function} callbacks.onStop        - () => void — recording stopped
 * @param {Function} callbacks.onError       - (message: string) => void
 * @param {Function} callbacks.onModelStatus - ({ status: 'loading'|'ready'|'downloading', progress?: number }) => void
 *
 * @returns {{ start: Function, stop: Function, isSupported: Function, preloadModel: Function }}
 */
export function createVoiceInput ({ onResult, onStart, onStop, onError, onModelStatus }) {
  let mediaRecorder = null
  let stream = null
  let chunks = []
  let isListening = false

  // ── Feature Detection ──────────────────────────────────────────────────────
  function isSupported () {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.MediaRecorder)
  }

  // ── Model Progress Handler ─────────────────────────────────────────────────
  function handleModelProgress (progress) {
    if (!onModelStatus) return
    // transformers.js sends: 'initiate', 'download', 'progress', 'progress_total', 'done', 'ready'
    if (progress.status === 'progress' || progress.status === 'download' || progress.status === 'progress_total') {
      const pct = typeof progress.progress === 'number' ? Math.round(progress.progress) : 0
      onModelStatus({ status: 'downloading', progress: pct })
    } else if (progress.status === 'done' || progress.status === 'ready') {
      onModelStatus({ status: 'loading' })
    } else {
      onModelStatus({ status: 'loading' })
    }
  }

  // ── Preload model in background (optional, improves first-use latency) ─────
  async function preloadModel () {
    try {
      onModelStatus?.({ status: 'loading' })
      await getWhisperPipeline(handleModelProgress)
      onModelStatus?.({ status: 'ready' })
    } catch (err) {
      console.error('[voice] Model preload failed:', err)
      onModelStatus?.({ status: 'error', message: err.message })
    }
  }

  // ── Start Recording ────────────────────────────────────────────────────────
  async function start () {
    if (isListening) return
    if (!isSupported()) {
      onError?.('Microphone not supported in this environment.')
      return
    }

    isListening = true
    chunks = []

    try {
      // Request microphone access
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      mediaRecorder = new MediaRecorder(stream)

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data)
      }

      mediaRecorder.onstop = async () => {
        // Release mic immediately
        stream?.getTracks().forEach(t => t.stop())
        stream = null
        isListening = false
        onStop?.()

        if (chunks.length === 0) {
          onError?.('No audio recorded. Please try again.')
          return
        }

        try {
          // Convert recorded audio to Float32Array at 16kHz
          const audioBlob = new Blob(chunks, { type: mediaRecorder.mimeType || 'audio/webm' })
          const float32Audio = await blobToFloat32(audioBlob)

          // Load Whisper (cached after first use)
          onModelStatus?.({ status: 'loading' })
          const asr = await getWhisperPipeline(handleModelProgress)
          onModelStatus?.({ status: 'ready' })

          // Transcribe 🎙️
          const result = await asr(float32Audio, {
            return_timestamps: false
          })

          const text = result?.text?.trim()
          if (text) {
            onResult?.(text, true)
          } else {
            onError?.('No speech detected. Please try again.')
          }
        } catch (err) {
          console.error('[voice] Transcription error:', err)
          onError?.(`Voice error: ${err.message ?? 'Transcription failed'}`)
        }
      }

      mediaRecorder.onerror = (e) => {
        isListening = false
        stream?.getTracks().forEach(t => t.stop())
        onError?.(`Recording error: ${e.error?.message ?? 'Unknown error'}`)
        onStop?.()
      }

      // Collect audio in chunks every 100ms for smoother processing
      mediaRecorder.start(100)
      onStart?.()

    } catch (err) {
      isListening = false
      stream?.getTracks().forEach(t => t.stop())

      if (err.name === 'NotAllowedError') {
        onError?.('Microphone permission denied. Please allow mic access and try again.')
      } else if (err.name === 'NotFoundError') {
        onError?.('No microphone found. Please connect a microphone.')
      } else {
        onError?.(`Could not start microphone: ${err.message}`)
      }
    }
  }

  // ── Stop Recording ─────────────────────────────────────────────────────────
  function stop () {
    if (!isListening || !mediaRecorder) return
    try {
      mediaRecorder.stop()
    } catch {
      // Already stopped
    }
  }

  return { start, stop, isSupported, preloadModel }
}
