/**
 * Toast — src/renderer/src/components/Toast.jsx  (CodeLoom)
 *
 * IPC-driven toast notification component.
 * Used for system alerts, status updates, and notifications.
 */
import { useEffect, useRef } from 'react'
import '../styles/index.css'

/**
 * @param {{ toast: { message: string, type: 'info'|'warning'|'success'|'error' } | null }} props
 * @param {Function} props.onDismiss
 */
export default function Toast ({ toast, onDismiss }) {
  const timerRef = useRef(null)

  useEffect(() => {
    if (!toast) return
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(onDismiss, 2500)
    return () => clearTimeout(timerRef.current)
  }, [toast, onDismiss])

  if (!toast) return null

  return (
    <div
      className={`app-toast toast-${toast.type || 'info'}`}
      role="status"
      aria-live="polite"
      aria-label={toast.message}
    >
      {toast.message}
    </div>
  )
}
