import { registerOrdersListInvalidator } from './cacheHooks'
import { ordersApi } from './ordersApi/ordersApi'

registerOrdersListInvalidator(() => {
  ordersApi.invalidateListCache()
})
