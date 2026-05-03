type VoidFn = () => void

let _invalidateOrdersList: VoidFn | null = null

export function registerOrdersListInvalidator(fn: VoidFn) {
  _invalidateOrdersList = fn
}

/** Customer changes can affect names shown on cached order rows — refresh order list cache. */
export function runOrdersListInvalidator() {
  _invalidateOrdersList?.()
}
