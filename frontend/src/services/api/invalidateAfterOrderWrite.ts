import { customersApi } from './customersApi/customersApi'
import { dashboardApi } from './dashboardApi/dashboardApi'

export function invalidateDashboardAndCustomerOrderCaches() {
  dashboardApi.invalidateAllReadCaches()
  customersApi.invalidateOrderHistoryCaches()
}
