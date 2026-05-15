import { env } from '../config/env.js'

let cachedBearer: string | null = null
let tokenUntil = 0

const enc = (s: string) => encodeURIComponent(s)

export function phonePeReady() {
  return env.phonepe.enabled && env.phonepe.clientId && env.phonepe.clientSecret
}

function oauthUrl() {
  return env.phonepe.sandbox
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token'
    : 'https://api.phonepe.com/apis/identity-manager/v1/oauth/token'
}

function payUrl() {
  return env.phonepe.sandbox
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay'
    : 'https://api.phonepe.com/apis/pg/checkout/v2/pay'
}

function statusUrl(merchantOrderId: string) {
  const base = env.phonepe.sandbox
    ? 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/order/'
    : 'https://api.phonepe.com/apis/pg/checkout/v2/order/'
  return `${base}${enc(merchantOrderId)}/status?details=false&errorContext=false`
}

async function authHeader(): Promise<string> {
  if (cachedBearer && Date.now() < tokenUntil - 60_000) return `O-Bearer ${cachedBearer}`
  const body = new URLSearchParams({
    client_id: env.phonepe.clientId,
    client_version: env.phonepe.clientVersion,
    client_secret: env.phonepe.clientSecret,
    grant_type: 'client_credentials',
  })
  const res = await fetch(oauthUrl(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  if (!res.ok) throw new Error(`PhonePe token HTTP ${res.status}`)
  const j = (await res.json()) as { access_token?: string; expires_at?: number }
  if (!j.access_token) throw new Error('PhonePe token missing access_token')
  cachedBearer = j.access_token
  tokenUntil = j.expires_at ? j.expires_at * 1000 : Date.now() + 25 * 60_000
  return `O-Bearer ${cachedBearer}`
}

export async function createCheckout(amountPaisa: number, merchantOrderId: string, redirectUrl: string) {
  const auth = await authHeader()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: auth }
  if (env.phonepe.merchantId) headers['X-MERCHANT-ID'] = env.phonepe.merchantId
  const res = await fetch(payUrl(), {
    method: 'POST',
    headers,
    body: JSON.stringify({
      merchantOrderId,
      amount: amountPaisa,
      expireAfter: 1800,
      paymentFlow: { type: 'PG_CHECKOUT', message: 'Tailor order payment', merchantUrls: { redirectUrl } },
      metaInfo: { udf1: merchantOrderId },
    }),
  })
  if (!res.ok) throw new Error(`PhonePe create HTTP ${res.status}: ${await res.text()}`)
  const j = (await res.json()) as { redirectUrl?: string; orderId?: string }
  if (!j.redirectUrl) throw new Error('PhonePe missing redirectUrl')
  return { redirectUrl: j.redirectUrl, phonePeOrderId: j.orderId || '' }
}

export async function getOrderStatus(merchantOrderId: string) {
  const auth = await authHeader()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', Authorization: auth }
  if (env.phonepe.merchantId) headers['X-MERCHANT-ID'] = env.phonepe.merchantId
  const res = await fetch(statusUrl(merchantOrderId), { headers })
  if (!res.ok) throw new Error(`PhonePe status HTTP ${res.status}`)
  return res.json() as Promise<{ state?: string }>
}
