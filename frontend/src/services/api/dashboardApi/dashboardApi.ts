import { api } from '../api'

export type DashboardStats = {
  totalOrders: number
  pendingDeliveries: number
  dailyIncome: number | null
}

class DashboardApi {
  private readonly _url = {
    STATS: '/api/dashboard/stats',
  } as const

  stats() {
    return api._get<DashboardStats>(this._url.STATS)
  }
}

export const dashboardApi = new DashboardApi()

