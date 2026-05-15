import { customersApi } from './api/customersApi/customersApi'
import { dashboardApi } from './api/dashboardApi/dashboardApi'
import { ordersApi } from './api/ordersApi/ordersApi'

export type OrdersChangedDetail = { orderId?: string; action?: string }
export type CustomersChangedDetail = { customerId?: string; action?: string }

export const TS_ORDERS_CHANGED = 'ts:orders-changed'
export const TS_CUSTOMERS_CHANGED = 'ts:customers-changed'
export const TS_NOTIFICATIONS_UPDATED = 'ts:notifications-updated'

export function handleRealtimeMessage(msg: { type: string; orderId?: string; customerId?: string; action?: string }) {
  switch (msg.type) {
    case 'orders:changed':
      ordersApi.invalidateListCache()
      if (msg.orderId) ordersApi.invalidateOrderCache(msg.orderId)
      window.dispatchEvent(
        new CustomEvent<OrdersChangedDetail>(TS_ORDERS_CHANGED, {
          detail: { orderId: msg.orderId, action: msg.action },
        }),
      )
      break
    case 'customers:changed':
      customersApi.invalidateAllReadCaches()
      dashboardApi.invalidateAllReadCaches()
      window.dispatchEvent(
        new CustomEvent<CustomersChangedDetail>(TS_CUSTOMERS_CHANGED, {
          detail: { customerId: msg.customerId, action: msg.action },
        }),
      )
      break
    case 'notifications:updated':
      window.dispatchEvent(new CustomEvent(TS_NOTIFICATIONS_UPDATED))
      break
    default:
      break
  }
}

export function onOrdersChanged(handler: (detail: OrdersChangedDetail) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<OrdersChangedDetail>).detail || {})
  window.addEventListener(TS_ORDERS_CHANGED, fn)
  return () => window.removeEventListener(TS_ORDERS_CHANGED, fn)
}

export function onCustomersChanged(handler: (detail: CustomersChangedDetail) => void) {
  const fn = (e: Event) => handler((e as CustomEvent<CustomersChangedDetail>).detail || {})
  window.addEventListener(TS_CUSTOMERS_CHANGED, fn)
  return () => window.removeEventListener(TS_CUSTOMERS_CHANGED, fn)
}

/** Instant same-tab refresh (WebSocket also broadcasts to all connected clients). */
export function publishOrdersChanged(detail: OrdersChangedDetail) {
  window.dispatchEvent(new CustomEvent<OrdersChangedDetail>(TS_ORDERS_CHANGED, { detail }))
}

export function publishCustomersChanged(detail: CustomersChangedDetail) {
  window.dispatchEvent(new CustomEvent<CustomersChangedDetail>(TS_CUSTOMERS_CHANGED, { detail }))
}
