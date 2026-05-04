/**
 * Maps Tailor Studio :root tokens (style.css) into canvas-friendly colors.
 */

function cssVar(name: string, fallback: string): string {
  if (typeof document === 'undefined') return fallback
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return v || fallback
}

function parseHex(hex: string): [number, number, number] | null {
  const m = hex.replace(/\s/g, '').match(/^#?([0-9a-f]{6})$/i)
  if (!m) return null
  const x = m[1]
  return [parseInt(x.slice(0, 2), 16), parseInt(x.slice(2, 4), 16), parseInt(x.slice(4, 6), 16)]
}

function toHex(r: number, g: number, b: number): string {
  const c = (n: number) => Math.max(0, Math.min(255, Math.round(n))).toString(16).padStart(2, '0')
  return `#${c(r)}${c(g)}${c(b)}`
}

function mix(a: string, b: string, t: number): string {
  const A = parseHex(a)
  const B = parseHex(b)
  if (!A || !B) return a
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

export type SewTheme = {
  fabric: string
  fabricMid: string
  fabricStroke: string
  fabricSoft: string
  sparkle: string
  metal: string
  metalStroke: string
  cut: string
  cutStroke: string
  machineBase: string
  machineBody: string
  machineStroke: string
  wheel: string
  wheelSpoke: string
  needle: string
  threadGold: string
  threadGoldSoft: string
  worklight: string
  success: string
  successStroke: string
  title: string
  dotInactive: string
  dotLine: string
  check: string
  pinkSpark: string
  cyanSpark: string
  /** Progress dot — “sewing” phase (between cut and done). */
  sewAccent: string
}

export function getSewTheme(): SewTheme {
  const teal = cssVar('--teal', '#2f7f7b')
  const accent = cssVar('--accent', '#9a7423')
  const danger = cssVar('--danger', '#f87171')
  const success = cssVar('--success', '#4ade80')
  const text = cssVar('--text', '#1a2f35')
  const bg = cssVar('--bg', '#eef2f4')

  const fabric = mix(teal, '#ffffff', 0.22)
  const fabricMid = mix(teal, '#ffffff', 0.08)
  const fabricStroke = mix(teal, text, 0.35)
  const fabricSoft = mix(fabric, bg, 0.35)
  const sparkle = mix(teal, '#ffffff', 0.55)

  return {
    fabric,
    fabricMid,
    fabricStroke,
    fabricSoft,
    sparkle,
    metal: mix(text, '#ffffff', 0.72),
    metalStroke: mix(text, '#ffffff', 0.45),
    cut: danger,
    cutStroke: mix(danger, text, 0.25),
    machineBase: mix(text, teal, 0.55),
    machineBody: mix(text, '#1a1a2e', 0.15),
    machineStroke: mix(text, '#ffffff', 0.35),
    wheel: mix(text, '#8899aa', 0.4),
    wheelSpoke: mix(text, '#aab8c8', 0.55),
    needle: mix(text, '#dde4ea', 0.65),
    threadGold: mix(accent, '#ffd080', 0.35),
    threadGoldSoft: mix(accent, '#fff8e8', 0.5),
    worklight: mix(accent, '#fff3c0', 0.55),
    success,
    successStroke: mix(success, text, 0.2),
    title: mix(text, teal, 0.15),
    dotInactive: mix(text, bg, 0.55),
    dotLine: mix(text, bg, 0.7),
    check: success,
    pinkSpark: mix(danger, '#ffb0c8', 0.35),
    cyanSpark: mix(teal, '#b8f0ec', 0.45),
    sewAccent: mix(teal, '#5f6b8a', 0.4),
  }
}
