/** Keep only a valid in-progress rupee amount string (digits + optional decimal, max 2 frac digits). */
export function sanitizeMoneyInput(raw: string): string {
  if (!raw) return ''
  let s = raw.replace(/,/g, '').replace(/[^\d.]/g, '')
  const firstDot = s.indexOf('.')
  if (firstDot !== -1) {
    s = s.slice(0, firstDot + 1) + s.slice(firstDot + 1).replace(/\./g, '')
    const [whole, frac = ''] = s.split('.')
    s = frac.length ? `${whole}.${frac.slice(0, 2)}` : whole + (raw.endsWith('.') ? '.' : '')
  }
  return s
}

export function parseMoneyAmount(raw: string): number {
  const s = sanitizeMoneyInput(String(raw ?? '').trim())
  if (!s || s === '.') return 0
  const n = Number(s)
  return Number.isFinite(n) ? n : 0
}

/** Format API numbers for controlled text inputs (avoids 999.999999999-style float noise). */
export function formatMoneyForInput(n: unknown): string {
  if (n == null || n === '') return ''
  const x = Number(n)
  if (!Number.isFinite(x)) return ''
  const rounded = Math.round(x * 100) / 100
  if (rounded === 0) return '0'
  const fixed = rounded.toFixed(2)
  return fixed.replace(/\.?0+$/, '')
}
