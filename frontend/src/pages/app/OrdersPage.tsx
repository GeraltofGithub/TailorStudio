import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { appService } from '../../services/appService'
import { Pagination } from '../../components/Pagination'

type OrderRow = {
  id: number
  serialNumber: number
  garmentType: string
  orderDate: string
  deliveryDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | string
  totalAmount: number
  advanceAmount?: number | null
  customer: { name: string }
}

function statusBadgeClass(st: string) {
  const map: Record<string, string> = {
    PENDING: 'badge-pending',
    IN_PROGRESS: 'badge-progress',
    READY: 'badge-ready',
    DELIVERED: 'badge-done',
  }
  return map[st] || ''
}

export default memo(function OrdersPage() {
  const [orders, setOrders] = useState<OrderRow[]>([])
  const [page, setPage] = useState(1)
  const pageSize = 15

  useEffect(() => {
    let alive = true
    ;(async () => {
      const data = (await appService.orders.list()) as unknown as OrderRow[]
      if (!alive) return
      setOrders(data || [])
    })()
    return () => {
      alive = false
    }
  }, [])

  const rows = useMemo(() => orders, [orders])
  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, rows])

  return (
    <div className="panel">
      <div className="panel-header">
        <h2>All orders</h2>
        <Link className="btn btn-primary btn-sm" to="/app/order">
          New order
        </Link>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>#</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Order</th>
              <th>Delivery</th>
              <th>Status</th>
              <th>Total</th>
              <th>Balance</th>
              <th className="no-print"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>No orders yet.</td>
              </tr>
            ) : (
              pagedRows.map((o) => {
                const bal = Number(o.totalAmount) - Number(o.advanceAmount || 0)
                return (
                  <tr key={o.id}>
                    <td>#{o.serialNumber}</td>
                    <td>{o.customer?.name || '—'}</td>
                    <td>{o.garmentType}</td>
                    <td>{o.orderDate}</td>
                    <td>{o.deliveryDate}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>{String(o.status).replace('_', ' ')}</span>
                    </td>
                    <td>₹ {Number(o.totalAmount).toFixed(0)}</td>
                    <td>₹ {bal.toFixed(0)}</td>
                    <td className="no-print" style={{ whiteSpace: 'nowrap' }}>
                      <Link className="btn btn-teal btn-sm" to={`/app/order?id=${o.id}`}>
                        Open
                      </Link>{' '}
                      <Link className="btn btn-ghost btn-sm" to={`/app/payments?id=${o.id}`}>
                        Receipts
                      </Link>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
      <Pagination page={page} pageSize={pageSize} total={rows.length} onPageChange={setPage} />
    </div>
  )
})

