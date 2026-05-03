import './registerCacheHooks'

import { customersApi } from './customersApi/customersApi'
import { dashboardApi } from './dashboardApi/dashboardApi'
import { ordersApi } from './ordersApi/ordersApi'
import { teamApi } from './teamApi/teamApi'

/** After logout / full session reset: drop all in-memory GET caches. */
export function resetSessionReadCaches() {
  ordersApi.invalidateAllReadCaches()
  customersApi.invalidateAllReadCaches()
  dashboardApi.invalidateAllReadCaches()
  teamApi.invalidateAllReadCaches()
}
