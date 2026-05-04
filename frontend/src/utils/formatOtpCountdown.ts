/** Remaining time as `m:ss` for OTP countdowns (floor seconds, zero-padded). */
export function formatOtpCountdown(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return `${m}:${r.toString().padStart(2, '0')}`
}
