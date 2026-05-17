import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Plus } from 'lucide-react'

import { appService } from '../../services/appService'
import { onOrdersChanged } from '../../services/businessRealtime'
import { Pagination } from '../../components/Pagination'

type OrderRow = {
  id: string
  serialNumber: number
  garmentType: string
  orderDate: string
  deliveryDate: string
  status: 'PENDING' | 'IN_PROGRESS' | 'READY' | 'DELIVERED' | string
  totalAmount: number
  advanceAmount?: number | null
  customer: { name: string; serialNumber?: number }
}

function formatOrderId(serial?: number) {
  return serial ? `OD_${String(serial).padStart(3, '0')}` : '—'
}

function formatCustomerId(serial?: number) {
  return serial ? `CUS_${String(serial).padStart(3, '0')}` : '—'
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
  const [orders, setOrders] = useState<OrderRow[]>(() => (appService.orders.listSync() || []) as unknown as OrderRow[])
  const [page, setPage] = useState(1)
  const pageSize = 15

  const refreshOrders = useCallback(async () => {
    const data = (await appService.orders.list()) as unknown as OrderRow[]
    setOrders(data || [])
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!alive) return
      await refreshOrders()
    })()
    return () => {
      alive = false
    }
  }, [refreshOrders])

  useEffect(() => onOrdersChanged(() => void refreshOrders()), [refreshOrders])

  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [dateFilter, setDateFilter] = useState('ALL')

  const rows = useMemo(() => {
    let filtered = orders
    if (search.trim()) {
      const q = search.toLowerCase().trim()
      filtered = filtered.filter((o) => {
        const orderId = formatOrderId(o.serialNumber).toLowerCase()
        const custId = formatCustomerId(o.customer?.serialNumber).toLowerCase()
        const custName = o.customer?.name?.toLowerCase() || ''
        return orderId.includes(q) || custId.includes(q) || custName.includes(q)
      })
    }
    if (statusFilter !== 'ALL') {
      filtered = filtered.filter((o) => o.status === statusFilter)
    }
    if (dateFilter !== 'ALL') {
      const now = new Date()
      filtered = filtered.filter((o) => {
        if (!o.orderDate) return false
        const d = new Date(o.orderDate)
        if (dateFilter === 'TODAY') {
          return d.toDateString() === now.toDateString()
        }
        if (dateFilter === 'WEEK') {
          const diff = now.getTime() - d.getTime()
          return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000
        }
        if (dateFilter === 'MONTH') {
          return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
        }
        if (dateFilter === 'YEAR') {
          return d.getFullYear() === now.getFullYear()
        }
        return true
      })
    }
    return filtered
  }, [orders, search, statusFilter, dateFilter])

  // Reset page when filters change
  useEffect(() => {
    setPage(1)
  }, [search, statusFilter, dateFilter])

  const pagedRows = useMemo(() => {
    const start = (page - 1) * pageSize
    return rows.slice(start, start + pageSize)
  }, [page, pageSize, rows])

  return (
    <div className="panel" style={{ background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
      <div className="orders-toolbar" style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        gap: '1.25rem', 
        marginBottom: '1.5rem', 
        background: 'var(--bg-elevated)', 
        padding: '1.25rem', 
        borderRadius: '12px', 
        border: '1px solid var(--border)' 
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.35rem' }}>All orders</h2>
          <Link className="btn btn-primary" to="/app/order">
            <Plus size={18} /> New order
          </Link>
        </div>

        <div className="filters-row" style={{ display: 'flex', gap: '0.85rem', flexWrap: 'wrap' }}>
          <div className="search-wrap" style={{ flex: '1 1 250px', position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Search Order ID, Customer ID, Name..." 
              value={search} 
              onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '0.65rem 1rem', paddingLeft: '2.5rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)' }}
            />
            <span style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', pointerEvents: 'none' }}>
              <Search size={16} />
            </span>
          </div>
          
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ flex: '0 1 180px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
            <option value="ALL">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="READY">Ready</option>
            <option value="DELIVERED">Delivered</option>
          </select>

          <select value={dateFilter} onChange={e => setDateFilter(e.target.value)} style={{ flex: '0 1 180px', padding: '0.65rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--bg-card)', cursor: 'pointer' }}>
            <option value="ALL">All Time</option>
            <option value="TODAY">Today</option>
            <option value="WEEK">This Week</option>
            <option value="MONTH">This Month</option>
            <option value="YEAR">This Year</option>
          </select>
        </div>
      </div>

      <div className="panel" style={{ padding: 0 }}>
        <div className="table-wrap">
          <table className="data" style={{ width: '100%' }}>
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
                    <td><strong>{formatOrderId(o.serialNumber)}</strong></td>
                    <td>
                      <div>{o.customer?.name || '—'}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{formatCustomerId(o.customer?.serialNumber)}</div>
                    </td>
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
  </div>
  )
})

