import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const root = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(root, '../../.env') })

const bool = (v: string | undefined, def = false) => {
  if (v == null || v === '') return def
  const s = v.trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}
const int = (v: string | undefined, d: number) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

const jwtSecret = (process.env.JWT_SECRET || '').trim()
if (Buffer.byteLength(jwtSecret, 'utf8') < 32) {
  throw new Error('JWT_SECRET must be at least 32 bytes')
}

const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').trim()
const LOCAL = [
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5174',
]

function origins(raw: string, alsoAdd: string) {
  const parsed = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (!s.startsWith('http') ? `https://${s}` : s.replace(/\/$/, '')))
  const set = new Set(parsed)
  const extra = alsoAdd.replace(/\/$/, '')
  if (extra) set.add(extra)
  if ([...set].some((o) => o.includes('localhost') || o.includes('127.0.0.1'))) LOCAL.forEach((o) => set.add(o))
  return [...set]
}

let staticOtpEnabled = bool(process.env.STATIC_OTP_ENABLED ?? process.env['app.otp.static-enabled'])
let staticOtp = (process.env.STATIC_OTP || process.env['app.otp.static-code'] || '').replace(/\D/g, '')
if (staticOtpEnabled && staticOtp.length !== 6) {
  console.warn('[env] STATIC_OTP_ENABLED is true but STATIC_OTP is not 6 digits — static bypass disabled')
  staticOtpEnabled = false
  staticOtp = ''
}
if (staticOtpEnabled) {
  console.warn('[env] Static OTP bypass ON (dev only). Code length 6.')
}

const isDev = process.env.NODE_ENV !== 'production'
const corsList = origins(process.env.CORS_ALLOWED_ORIGINS || frontendUrl, frontendUrl)

export const env = {
  isDev,
  port: int(process.env.PORT, 8001),
  mongoUri: process.env.MONGOURI || 'mongodb://localhost:27017/tailor-studio',
  corsOrigins: corsList,
  /** Allow https://*.vercel.app (preview deploys) in addition to FRONTEND_URL / CORS_ALLOWED_ORIGINS */
  allowVercelPreviews: bool(process.env.CORS_ALLOW_VERCEL_PREVIEWS, true),
  brandPublicUrl: (process.env.BRAND_PUBLIC_URL || frontendUrl).replace(/\/$/, ''),
  frontendUrl: frontendUrl.replace(/\/$/, ''),
  jwtSecret,
  jwtExpirationMs: int(process.env.JWT_EXPIRATION_MS, 2_592_000_000),
  otpPepper: process.env.OTP_PEPPER || 'tailor-studio-dev-otp-pepper-change-in-prod',
  staticOtpEnabled,
  staticOtp,
  mail: {
    user: (process.env.EMAIL || '').trim(),
    pass: (process.env.EMAIL_PASSWORD || '').trim(),
  },
  phonepe: {
    enabled: bool(process.env.PHONEPE_ENABLED),
    sandbox: bool(process.env.PHONEPE_SANDBOX, true),
    clientId: (process.env.PHONEPE_CLIENT_ID || '').trim(),
    clientVersion: (process.env.PHONEPE_CLIENT_VERSION || '1').trim(),
    clientSecret: (process.env.PHONEPE_CLIENT_SECRET || '').trim(),
    redirectBaseUrl: (process.env.PHONEPE_REDIRECT_BASE_URL || frontendUrl).replace(/\/$/, ''),
    merchantId: (process.env.PHONEPE_MERCHANT_ID || '').trim(),
  },
}
