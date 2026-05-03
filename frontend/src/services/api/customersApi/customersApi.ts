import { api } from '../api'
import { runOrdersListInvalidator } from '../cacheHooks'
import { TtlDedupeCache } from '../ttlDedupeCache'

export type Customer = {
  id: number
  name: string
  phone: string
  address?: string | null
  preferredUnit?: string
  active?: boolean
}

export type MeasurementTemplates = Record<string, Array<{ key: string; label: string; group?: string | null; hint?: string | null }>>

function cloneCustomer(c: Customer): Customer {
  return { ...c }
}

function cloneCustomers(cs: Customer[]): Customer[] {
  return (cs || []).map(cloneCustomer)
}

function cloneTemplates(t: MeasurementTemplates): MeasurementTemplates {
  try {
    return structuredClone(t) as MeasurementTemplates
  } catch {
    return JSON.parse(JSON.stringify(t)) as MeasurementTemplates
  }
}

class CustomersApi {
  private readonly _cache = new TtlDedupeCache(45_000)
  private readonly _templatesCache = new TtlDedupeCache(120_000)
  private readonly _measureCache = new TtlDedupeCache(25_000)

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

  invalidateAllReadCaches() {
    this._cache.clear()
    this._templatesCache.clear()
    this._measureCache.clear()
  }

  invalidateOrderHistoryCaches() {
    this._cache.deletePrefix('customers:orders:')
  }

  private invalidateCustomerListCaches() {
    this._cache.deletePrefix('customers:list:')
    this._cache.deletePrefix('customers:active:')
  }

  list(q?: string) {
    const key = `customers:list:${q ?? ''}`
    const url = q ? `${this._url.LIST}?q=${encodeURIComponent(q)}` : this._url.LIST
    return this._cache.load(key, () => api._get<Customer[]>(url), cloneCustomers)
  }

  listActive(q?: string) {
    const key = `customers:active:${q ?? ''}`
    const url = q ? `${this._url.LIST_ACTIVE}?q=${encodeURIComponent(q)}` : this._url.LIST_ACTIVE
    return this._cache.load(key, () => api._get<Customer[]>(url), cloneCustomers)
  }

  get(id: number) {
    const key = `customers:one:${id}`
    return this._cache.load(key, () => api._get<Customer>(this._url.ONE(id)), cloneCustomer)
  }

  create(data: { name: string; phone: string; address: string; preferredUnit: string }) {
    this.invalidateCustomerListCaches()
    return api._post<Customer>(this._url.LIST, data)
  }

  update(id: number, data: { name: string; phone: string; address: string; preferredUnit: string }) {
    this.invalidateCustomerListCaches()
    this._cache.delete(`customers:one:${id}`)
    runOrdersListInvalidator()
    return api._put<Customer>(this._url.ONE(id), data)
  }

  disable(id: number) {
    this.invalidateCustomerListCaches()
    this._cache.delete(`customers:one:${id}`)
    runOrdersListInvalidator()
    return api._post<Customer>(this._url.DISABLE(id), {})
  }

  enable(id: number) {
    this.invalidateCustomerListCaches()
    this._cache.delete(`customers:one:${id}`)
    runOrdersListInvalidator()
    return api._post<Customer>(this._url.ENABLE(id), {})
  }

  orders(id: number) {
    const key = `customers:orders:${id}`
    return this._cache.load(key, () => api._get<any[]>(this._url.ORDERS(id)), (rows) => (rows || []).map((o) => ({ ...o })))
  }

  getMeasurement(id: number, garment: string) {
    const key = `customers:meas:${id}:${garment}`
    return this._cache.load(
      key,
      () => api._get<{ dataJson: string }>(this._url.MEASURE(id, garment)),
      (m) => ({ ...m }),
    )
  }

  saveMeasurement(id: number, garment: string, data: { unit: string; values: Record<string, string> }) {
    this._measureCache.delete(`customers:meas:${id}:${garment}`)
    return api._put<{ ok?: boolean }>(this._url.MEASURE(id, garment), data)
  }

  templates() {
    return this._templatesCache.load(
      'customers:templates',
      () => api._get<MeasurementTemplates>(this._url.MEASURE_TEMPLATES),
      cloneTemplates,
      120_000,
    )
  }
}

export const customersApi = new CustomersApi()
