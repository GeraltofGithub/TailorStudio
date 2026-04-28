import { api } from '../api'

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

class OrdersApi {
  private readonly _url = {
    LIST: '/api/orders',
    ONE: (id: number) => `/api/orders/${id}`,
    PAY_INFO: (id: number) => `/api/orders/${id}/payments/info`,
    PAY_CASH: (id: number) => `/api/orders/${id}/payments/cash`,
    PAY_MARK: (id: number) => `/api/orders/${id}/payments/mark-paid`,
    PAY_PP_INIT: (id: number) => `/api/orders/${id}/payments/phonepe/initiate`,
    PAY_PP_SYNC: (id: number) => `/api/orders/${id}/payments/phonepe/sync`,
  } as const

  list() {
    return api._get<Order[]>(this._url.LIST)
  }

  get(id: number) {
    return api._get<Order>(this._url.ONE(id))
  }

  create(data: any) {
    return api._post<Order>(this._url.LIST, data)
  }

  update(id: number, data: any) {
    return api._put<Order>(this._url.ONE(id), data)
  }

  paymentInfo(id: number) {
    return api._get<any>(this._url.PAY_INFO(id))
  }

  payCash(id: number, amount: number) {
    return api._post<Order>(this._url.PAY_CASH(id), { amount })
  }

  markPaid(id: number) {
    return api._post<Order>(this._url.PAY_MARK(id), {})
  }

  phonePeInitiate(id: number) {
    return api._post<{ redirectUrl?: string; error?: string }>(this._url.PAY_PP_INIT(id), {})
  }

  phonePeSync(id: number) {
    return api._post<Order>(this._url.PAY_PP_SYNC(id), {})
  }
}

export const ordersApi = new OrdersApi()

