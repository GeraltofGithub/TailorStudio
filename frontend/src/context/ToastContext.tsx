import { createContext, memo, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { ToastItem } from '../components/ToastItem'

type ToastKind = 'success' | 'error'

type Toast = {
  id: number
  kind: ToastKind
  message: string
  createdAt: number
}

type ToastContextValue = {
  showToast: (kind: ToastKind, message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
  const v = useContext(ToastContext)
  if (!v) throw new Error('useToast must be used within ToastProvider')
  return v
}

export const ToastProvider = memo(function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const seq = useRef(1)
  const lastShownRef = useRef<{ key: string; at: number } | null>(null)
  const DURATION_MS = 5000

  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
  }, [])

  const showToast = useCallback((kind: ToastKind, message: string) => {
    // React StrictMode (dev) can mount/effect twice; avoid accidental duplicates.
    const key = `${kind}:${message}`
    const now = Date.now()
    const last = lastShownRef.current
    if (last && last.key === key && now - last.at < 800) return
    lastShownRef.current = { key, at: now }

    const id = seq.current++
    const t: Toast = { id, kind, message, createdAt: now }
    setToasts((prev) => [...prev, t])
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id))
    }, DURATION_MS)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <style>{`
        @keyframes ts_toast_bar {
          from { transform: scaleX(1); }
          to { transform: scaleX(0); }
        }
      `}</style>
      <div
        aria-live="polite"
        aria-relevant="additions"
        style={{
          position: 'fixed',
          top: '1rem',
          right: '1rem',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '0.5rem',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((t) => (
          <ToastItem
            key={t.id}
            kind={t.kind}
            message={t.message}
            durationMs={DURATION_MS}
            onDismiss={() => dismissToast(t.id)}
          />
        ))}
      </div>
    </ToastContext.Provider>
  )
})

