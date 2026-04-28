import { memo } from 'react'

type ToastKind = 'success' | 'error'

export const ToastItem = memo(function ToastItem(props: {
  kind: ToastKind
  message: string
  durationMs: number
  onDismiss: () => void
}) {
  const { kind, message, durationMs, onDismiss } = props

  return (
    <div
      style={{
        pointerEvents: 'auto',
        minWidth: 320,
        maxWidth: 420,
        borderRadius: 10,
        border: '1px solid rgba(15, 23, 42, 0.10)',
        background: '#ffffff',
        boxShadow: '0 18px 44px rgba(2, 6, 23, 0.14)',
        color: '#0f172a',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.75rem',
          padding: '0.9rem 0.9rem 0.75rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', minWidth: 0 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              display: 'grid',
              placeItems: 'center',
              background: kind === 'success' ? 'rgba(34, 197, 94, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: kind === 'success' ? '#16a34a' : '#dc2626',
              flex: '0 0 auto',
            }}
            aria-hidden="true"
          >
            {kind === 'success' ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 9v4" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <path d="M12 17h.01" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
                <path
                  d="M10.3 4.9c.7-1.2 2.7-1.2 3.4 0l7.8 13.4c.7 1.2-.2 2.7-1.7 2.7H4.2c-1.4 0-2.4-1.5-1.7-2.7L10.3 4.9z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
              </svg>
            )}
          </div>

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 650, lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {message}
            </div>
          </div>
        </div>

        <button
          type="button"
          aria-label="Close"
          onClick={onDismiss}
          style={{
            appearance: 'none',
            border: 'none',
            background: 'transparent',
            color: 'rgba(15, 23, 42, 0.55)',
            padding: 4,
            margin: 0,
            lineHeight: 1,
            cursor: 'pointer',
            borderRadius: 8,
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      <div
        style={{
          height: 4,
          background: 'rgba(15, 23, 42, 0.06)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            width: '100%',
            transformOrigin: 'left',
            background: kind === 'success' ? 'rgba(34, 197, 94, 0.85)' : 'rgba(239, 68, 68, 0.85)',
            animation: `ts_toast_bar ${durationMs}ms linear forwards`,
          }}
        />
      </div>
    </div>
  )
})

