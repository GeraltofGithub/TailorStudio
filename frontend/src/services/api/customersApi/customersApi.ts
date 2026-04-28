import { api } from '../api'

export type Customer = {
  id: number
  name: string
  phone: string
  address?: string | null
  preferredUnit?: string
  active?: boolean
}

export type MeasurementTemplates = Record<string, Array<{ key: string; label: string; group?: string | null; hint?: string | null }>>

class CustomersApi {
  private readonly _url = {
    LIST: '/api/customers',
    LIST_ACTIVE: '/api/customers/active',
    ONE: (id: number) => `/api/customers/${id}`,
    ORDERS: (id: number) => `/api/customers/${id}/orders`,
    MEASURE: (id: number, garment: string) => `/api/customers/${id}/measurements/${garment}`,
    DISABLE: (id: number) => `/api/customers/${id}/disable`,
    ENABLE: (id: number) => `/api/customers/${id}/enable`,
    MEASURE_TEMPLATES: '/api/measurement-templates',
  } as const

  list(q?: string) {
    const url = q ? `${this._url.LIST}?q=${encodeURIComponent(q)}` : this._url.LIST
    return api._get<Customer[]>(url)
  }

  listActive(q?: string) {
    const url = q ? `${this._url.LIST_ACTIVE}?q=${encodeURIComponent(q)}` : this._url.LIST_ACTIVE
    return api._get<Customer[]>(url)
  }

  get(id: number) {
    return api._get<Customer>(this._url.ONE(id))
  }

  create(data: { name: string; phone: string; address: string; preferredUnit: string }) {
    return api._post<Customer>(this._url.LIST, data)
  }

  update(id: number, data: { name: string; phone: string; address: string; preferredUnit: string }) {
    return api._put<Customer>(this._url.ONE(id), data)
  }

  disable(id: number) {
    return api._post<Customer>(this._url.DISABLE(id), {})
  }

  enable(id: number) {
    return api._post<Customer>(this._url.ENABLE(id), {})
  }

  orders(id: number) {
    return api._get<any[]>(this._url.ORDERS(id))
  }

  getMeasurement(id: number, garment: string) {
    return api._get<{ dataJson: string }>(this._url.MEASURE(id, garment))
  }

  saveMeasurement(id: number, garment: string, data: { unit: string; values: Record<string, string> }) {
    return api._put<{ ok?: boolean }>(this._url.MEASURE(id, garment), data)
  }

  templates() {
    return api._get<MeasurementTemplates>(this._url.MEASURE_TEMPLATES)
  }
}

export const customersApi = new CustomersApi()

