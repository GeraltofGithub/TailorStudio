import { api } from '../api'
import { TtlDedupeCache } from '../ttlDedupeCache'

export type DashboardStats = {
  totalOrders: number
  pendingDeliveries: number
  dailyIncome: number | null
}

export type DashboardRecentOrder = {
  id: string
  serialNumber: number
  garmentType: string
  deliveryDate: string
  status: string
  customer: { id?: string; name: string }
}

export type DashboardSummary = {
  stats: DashboardStats
  recentOrders: DashboardRecentOrder[]
}

function cloneSummary(s: DashboardSummary): DashboardSummary {
  return {
    stats: { ...s.stats },
    recentOrders: (s.recentOrders || []).map((o) => ({
      ...o,
      customer: o.customer ? { ...o.customer } : o.customer,
    })),
  }
}

class DashboardApi {
  private readonly _cache = new TtlDedupeCache(45_000)

  private readonly _url = {
    STATS: '/api/dashboard/stats',
    SUMMARY: '/api/dashboard/summary',
  } as const

  invalidateAllReadCaches() {
    this._cache.clear()
  }

  stats() {
    return this._cache.load(
      'dashboard:stats',
      () => api._get<DashboardStats>(this._url.STATS),
      (s) => ({ ...s }),
    )
  }

  summarySync() {
    return this._cache.getSync<DashboardSummary>('dashboard:summary', cloneSummary)
  }

  summary() {
    return this._cache.load('dashboard:summary', () => api._get<DashboardSummary>(this._url.SUMMARY), cloneSummary)
  }
}

export const dashboardApi = new DashboardApi()
