import crypto from 'crypto'
import { env } from '../config/env.js'

export const newSixDigitOtp = () => String(100_000 + crypto.randomInt(900_000))
export const sha256Hex = (s: string) => crypto.createHash('sha256').update(s, 'utf8').digest('hex')
export const randomTokenHex = (n: number) => crypto.randomBytes(n).toString('hex')

export function hashOtp(email: string, code: string) {
  const p = `${env.otpPepper}\n${email.trim().toLowerCase()}\n${code.trim()}`
  return sha256Hex(p)
}

export function constantTimeEquals(a: string, b: string) {
  try {
    const ab = Buffer.from(a)
    const bb = Buffer.from(b)
    return ab.length === bb.length && crypto.timingSafeEqual(ab, bb)
  } catch {
    return false
  }
}

export function otpDigitsOnly(code: unknown): string {
  return String(code ?? '').replace(/\D/g, '')
}

export function isStaticOtp(code: unknown) {
  if (!env.staticOtpEnabled) return false
  return env.staticOtp === otpDigitsOnly(code)
}
