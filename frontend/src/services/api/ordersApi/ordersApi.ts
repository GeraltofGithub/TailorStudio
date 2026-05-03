import { api } from '../api'
import { invalidateDashboardAndCustomerOrderCaches } from '../invalidateAfterOrderWrite'
import { TtlDedupeCache } from '../ttlDedupeCache'

export type OrderLine = { description: string; rate: number; amount: number }

export type Order = {
  id: number
  serialNumber: number
  garmentType: string
  orderDate: string
  deliveryDate: string
  status: string
  totalAmount: number
  advanceAmount: number
  customer: { id: number; name: string; phone?: string }
  lines: OrderLine[]
  notes?: string
  materialsNotes?: string
  demandsNotes?: string
  measurementSnapshotJson?: string
}

function cloneOrder(o: Order): Order {
  return {
    ...o,
    customer: o.customer ? { ...o.customer } : o.customer,
    lines: (o.lines || []).map((l) => ({ ...l })),
  }
}

function cloneOrderListRow(o: Order): Order {
  return {
    ...o,
    customer: o.customer ? { ...o.customer } : o.customer,
    lines: (o.lines || []).map((l) => ({ ...l })),
  }
}

function cloneOrdersList(rows: Order[]): Order[] {
  return (rows || []).map(cloneOrderListRow)
}

function cloneJsonish<T>(x: T): T {
  if (x == null || typeof x !== 'object') return x
  try {
    return structuredClone(x) as T
  } catch {
    return JSON.parse(JSON.stringify(x)) as T
  }
}

class OrdersApi {
  private readonly _listCache = new TtlDedupeCache(45_000)
  private readonly _getCache = new TtlDedupeCache(15_000)
  private readonly _payInfoCache = new TtlDedupeCache(10_000)

  private readonly _url = {
    LIST: '/api/orders',
    ONE: (id: number) => `/api/orders/${id}`,
    PAY_INFO: (id: number) => `/api/orders/${id}/payments/info`,
    PAY_CASH: (id: number) => `/api/orders/${id}/payments/cash`,
    PAY_MARK: (id: number) => `/api/orders/${id}/payments/mark-paid`,
    PAY_PP_INIT: (id: number) => `/api/orders/${id}/payments/phonepe/initiate`,
    PAY_PP_SYNC: (id: number) => `/api/orders/${id}/payments/phonepe/sync`,
  } as const

  invalidateAllReadCaches() {
    this._listCache.clear()
    this._getCache.clear()
    this._payInfoCache.clear()
  }

  invalidateListCache() {
    this._listCache.delete('orders:list')
    this._getCache.clear()
    this._payInfoCache.clear()
    invalidateDashboardAndCustomerOrderCaches()
  }

  list() {
    return this._listCache.load('orders:list', () => api._get<Order[]>(this._url.LIST), cloneOrdersList)
  }

  get(id: number) {
    const key = `orders:get:${id}`
    return this._getCache.load(key, () => api._get<Order>(this._url.ONE(id)), cloneOrder)
  }

  create(data: any) {
    this.invalidateListCache()
    return api._post<Order>(this._url.LIST, data)
  }

  update(id: number, data: any) {
    this.invalidateListCache()
    this._payInfoCache.delete(`orders:payinfo:${id}`)
    return api._put<Order>(this._url.ONE(id), data)
  }

  paymentInfo(id: number) {
    const key = `orders:payinfo:${id}`
    return this._payInfoCache.load(key, () => api._get<any>(this._url.PAY_INFO(id)), cloneJsonish)
  }

  payCash(id: number, amount: number) {
    this.invalidateListCache()
    this._payInfoCache.delete(`orders:payinfo:${id}`)
    return api._post<Order>(this._url.PAY_CASH(id), { amount })
  }

  markPaid(id: number) {
    this.invalidateListCache()
    this._payInfoCache.delete(`orders:payinfo:${id}`)
    return api._post<Order>(this._url.PAY_MARK(id), {})
  }

  phonePeInitiate(id: number) {
    this.invalidateListCache()
    this._payInfoCache.delete(`orders:payinfo:${id}`)
    return api._post<{ redirectUrl?: string; error?: string }>(this._url.PAY_PP_INIT(id), {})
  }

  phonePeSync(id: number) {
    this.invalidateListCache()
    this._payInfoCache.delete(`orders:payinfo:${id}`)
    return api._post<Order>(this._url.PAY_PP_SYNC(id), {})
  }
}

export const ordersApi = new OrdersApi()
