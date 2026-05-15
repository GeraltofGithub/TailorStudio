import { TailorOrder } from '../models/TailorOrder.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApi } from '../utils/apiJson.js'
import { createCheckout, getOrderStatus, phonePeReady } from '../payment/phonePeClient.js'
import { env } from '../config/env.js'
import { emitOrdersChanged } from '../ws/realtime.js'

async function requireOrder(businessId: string, orderId: string) {
  const o = await TailorOrder.findOne({
    _id: parseObjectId(orderId),
    businessId: parseObjectId(businessId),
  })
  if (!o) throw new Error('Not found')
  return o
}

const balance = (o: { totalAmount: number; advanceAmount: number }) =>
  Math.max(0, (o.totalAmount ?? 0) - (o.advanceAmount ?? 0))

function refreshPaid(o: InstanceType<typeof TailorOrder>) {
  if (o.totalAmount <= 0) return
  if (o.advanceAmount >= o.totalAmount) {
    if (!o.paidInFullAt) o.paidInFullAt = new Date()
  } else o.paidInFullAt = null
}

function refreshDelivered(o: InstanceType<typeof TailorOrder>) {
  if (o.paidInFullAt && o.status !== 'DELIVERED') {
    o.status = 'DELIVERED'
    if (!o.deliveredAt) o.deliveredAt = new Date()
  }
}

export const getOrderForBusiness = requireOrder

export async function recordCash(businessId: string, orderId: string, amount: number) {
  if (!amount || amount <= 0) throw new Error('Amount must be positive')
  const o = await requireOrder(businessId, orderId)
  const bal = balance(o)
  if (bal <= 0) throw new Error('No balance due for this order')
  o.advanceAmount += Math.min(amount, bal)
  o.lastPaymentMethod = 'CASH'
  refreshPaid(o)
  refreshDelivered(o)
  await o.save()
  emitOrdersChanged(businessId, orderId, 'payment')
  return toApi(o.toJSON() as Record<string, unknown>)
}

export async function markPaidInFull(businessId: string, orderId: string, method: string) {
  const o = await requireOrder(businessId, orderId)
  if (o.totalAmount <= 0) throw new Error('Order total is zero')
  o.advanceAmount = o.totalAmount
  o.lastPaymentMethod = method === 'ONLINE' ? 'ONLINE' : 'CASH'
  refreshPaid(o)
  refreshDelivered(o)
  await o.save()
  emitOrdersChanged(businessId, orderId, 'payment')
  return toApi(o.toJSON() as Record<string, unknown>)
}

export async function initiatePhonePe(businessId: string, orderId: string) {
  if (!phonePeReady()) throw new Error('PhonePe is not configured. Set PHONEPE_ENABLED=true and credentials.')
  const o = await requireOrder(businessId, orderId)
  const bal = balance(o)
  if (bal <= 0) throw new Error('No balance due for this order')
  const paisa = Math.round(bal * 100)
  if (paisa < 100) throw new Error('Balance must be at least ₹1 for PhonePe')
  let merchantOrderId = `O${orderId}T${Date.now()}`
  if (merchantOrderId.length > 63) merchantOrderId = merchantOrderId.slice(0, 63)
  const redirectUrl = `${env.phonepe.redirectBaseUrl}/app/phonepe-return.html?orderId=${orderId}`
  o.phonePeMerchantOrderId = merchantOrderId
  await o.save()
  const pay = await createCheckout(paisa, merchantOrderId, redirectUrl)
  return { redirectUrl: pay.redirectUrl, merchantOrderId, phonePeOrderId: pay.phonePeOrderId }
}

export async function syncPhonePe(businessId: string, orderId: string) {
  if (!phonePeReady()) throw new Error('PhonePe is not configured')
  const o = await requireOrder(businessId, orderId)
  if (!o.phonePeMerchantOrderId) throw new Error('No PhonePe checkout found for this order')
  const st = await getOrderStatus(o.phonePeMerchantOrderId)
  if (st.state === 'COMPLETED') {
    o.advanceAmount = o.totalAmount
    o.lastPaymentMethod = 'ONLINE'
    refreshPaid(o)
    refreshDelivered(o)
    await o.save()
    emitOrdersChanged(businessId, orderId, 'payment')
  }
  return toApi(o.toJSON() as Record<string, unknown>)
}

export function paymentInfo(o: InstanceType<typeof TailorOrder>) {
  const bal = balance(o)
  return {
    totalAmount: o.totalAmount,
    advanceAmount: o.advanceAmount,
    balanceDue: bal,
    paidInFull: !!o.paidInFullAt || bal <= 0,
    paidInFullAt: o.paidInFullAt,
    lastPaymentMethod: o.lastPaymentMethod || 'NONE',
    phonePeConfigured: phonePeReady(),
  }
}
