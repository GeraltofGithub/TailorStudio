import { api } from '../api'
import { TtlDedupeCache } from '../ttlDedupeCache'

export type DashboardStats = {
  totalOrders: number
  pendingDeliveries: number
  dailyIncome: number | null
}

class DashboardApi {
  private readonly _cache = new TtlDedupeCache(45_000)

  private readonly _url = {
    STATS: '/api/dashboard/stats',
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
}

export const dashboardApi = new DashboardApi()
