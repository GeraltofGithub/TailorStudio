import { emitToBusiness } from './socketHub.js'

export type OrderRealtimeAction = 'created' | 'updated' | 'payment'

export function emitOrdersChanged(businessId: string, orderId: string, action: OrderRealtimeAction) {
  emitToBusiness(businessId, { type: 'orders:changed', orderId, action })
}

export function emitCustomersChanged(businessId: string, customerId: string, action: 'created' | 'updated') {
  emitToBusiness(businessId, { type: 'customers:changed', customerId, action })
}
