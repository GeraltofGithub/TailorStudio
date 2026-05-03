import { memo, useCallback, useRef } from 'react'

type Props = {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
  idPrefix?: string
}

/** Six single-digit inputs; `value` length 6, each entry '' or one digit. */
export const OtpSixBoxes = memo(function OtpSixBoxes({ value, onChange, disabled, idPrefix = 'otp' }: Props) {
  const refs = useRef<Array<HTMLInputElement | null>>([])

  const setAt = useCallback(
    (i: number, ch: string) => {
      const d = ch.replace(/\D/g, '').slice(-1)
      const next = [...value]
      while (next.length < 6) next.push('')
      next[i] = d
      onChange(next.slice(0, 6))
      if (d && i < 5) refs.current[i + 1]?.focus()
    },
    [onChange, value],
  )

  const onKeyDown = useCallback(
    (i: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !value[i] && i > 0) {
        e.preventDefault()
        refs.current[i - 1]?.focus()
      }
      if (e.key === 'ArrowLeft' && i > 0) refs.current[i - 1]?.focus()
      if (e.key === 'ArrowRight' && i < 5) refs.current[i + 1]?.focus()
    },
    [value],
  )

  const onPaste = useCallback(
    (e: React.ClipboardEvent) => {
      e.preventDefault()
      const raw = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
      const next = raw.split('')
      while (next.length < 6) next.push('')
      onChange(next.slice(0, 6) as string[])
      const focusIdx = Math.min(raw.length, 5)
      refs.current[focusIdx]?.focus()
    },
    [onChange],
  )

  return (
    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center', flexWrap: 'nowrap' }} onPaste={onPaste}>
      {Array.from({ length: 6 }, (_, i) => (
        <input
          key={i}
          id={`${idPrefix}-${i}`}
          ref={(el) => {
            refs.current[i] = el
          }}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          value={value[i] || ''}
          onChange={(e) => setAt(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          className="ts-otp-cell"
          style={{
            width: '2.5rem',
            textAlign: 'center',
            fontSize: '1.25rem',
            fontWeight: 600,
            padding: '0.5rem 0',
            borderRadius: '8px',
            border: '1px solid #c9ced6',
            background: '#fff',
            color: '#000',
            caretColor: '#000',
          }}
        />
      ))}
    </div>
  )
})
