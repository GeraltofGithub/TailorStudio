import { memo, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { appService } from '../../services/appService'

type DashboardStats = {
  totalOrders: number
  pendingDeliveries: number
  dailyIncome: number | null
}

type OrderRow = {
  id: number
  serialNumber: number
  garmentType: string
  deliveryDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | string
  customer: { name: string }
}

function money(n: unknown) {
  if (n == null) return '—'
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return `₹ ${x.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
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

export default memo(function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recent, setRecent] = useState<OrderRow[]>([])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const s = await appService.dashboard.stats()
      const orders = (await appService.orders.list()) as unknown as OrderRow[]
      if (!alive) return
      setStats(s)
      setRecent((orders || []).slice(0, 8))
    })()
    return () => {
      alive = false
    }
  }, [])

  const rows = useMemo(() => recent, [recent])

  return (
    <>
      <div className="grid-metrics">
        <div className="metric">
          <div className="label">Total orders</div>
          <div className="value">{stats ? stats.totalOrders : '—'}</div>
        </div>
        <div className="metric">
          <div className="label">Active (not delivered)</div>
          <div className="value accent">{stats ? stats.pendingDeliveries : '—'}</div>
        </div>
        <div className="metric">
          <div className="label">Income today (delivered)</div>
          <div className="value">{stats ? money(stats.dailyIncome) : '—'}</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Recent orders</h2>
          <Link className="btn btn-teal btn-sm" to="/app/orders">
            View all
          </Link>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Customer</th>
                <th>Type</th>
                <th>Delivery</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={6}>No orders yet.</td>
                </tr>
              ) : (
                rows.map((o) => (
                  <tr key={o.id}>
                    <td>#{o.serialNumber}</td>
                    <td>{o.customer?.name || '—'}</td>
                    <td>{o.garmentType}</td>
                    <td>{o.deliveryDate}</td>
                    <td>
                      <span className={`badge ${statusBadgeClass(o.status)}`}>{String(o.status).replace('_', ' ')}</span>
                    </td>
                    <td>
                      <Link to={`/app/order?id=${o.id}`}>Open</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
})

