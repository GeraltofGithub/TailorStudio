import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { useAppToast } from '../../utils/toast'

type Garment = 'SHIRT' | 'PANT' | 'BLOUSE' | 'SUIT'
const GARMENTS: Garment[] = ['SHIRT', 'PANT', 'BLOUSE', 'SUIT']

type MeasurementFieldDef = { key: string; label: string; group?: string | null; hint?: string | null }
type TemplatesMap = Record<string, MeasurementFieldDef[]>

type MeasurementPayload = { unit: 'INCH' | 'CM'; values: Record<string, string> }

function round1(n: number) {
  return Math.round(n * 10) / 10
}

function inchToCm(inches: number) {
  return inches * 2.54
}

function exampleInchesForField(label: string) {
  const s = (label || '').toLowerCase()
  if (s.includes('collar') || s.includes('neck')) return 15.5
  if (s.includes('shoulder')) return 18
  if (s.includes('chest')) return 40
  if (s.includes('waist')) return 32
  if (s.includes('seat') || s.includes('hip')) return 40
  if (s.includes('length') && s.includes('sleeve')) return 25
  if (s.includes('sleeve')) return 25
  if (s.includes('shirt') && s.includes('length')) return 29
  if (s.includes('bicep') || s.includes('upper arm')) return 13
  if (s.includes('cuff') || s.includes('wrist')) return 7.5
  return null
}

function placeholderFor(unit: 'INCH' | 'CM', label: string) {
  const exIn = exampleInchesForField(label)
  const unitLabel = unit === 'INCH' ? 'in' : 'cm'
  if (exIn == null) return `Enter value (${unitLabel})`
  const ex = unit === 'INCH' ? exIn : round1(inchToCm(exIn))
  return `Enter value (e.g. ${ex} ${unitLabel})`
}

function groupFields(fields: MeasurementFieldDef[]) {
  const by: Record<string, MeasurementFieldDef[]> = {}
  ;(fields || []).forEach((f) => {
    const g = f.group || 'Measurements'
    if (!by[g]) by[g] = []
    by[g].push(f)
  })
  return by
}

function parsePayloadJson(dataJsonStr: string) {
  try {
    const o = JSON.parse(dataJsonStr || '{}') as any
    if (o.unit && o.values) return { unit: o.unit as 'INCH' | 'CM', values: (o.values || {}) as Record<string, string> }
    return { unit: 'INCH' as const, values: (o && typeof o === 'object' ? o : {}) as Record<string, string> }
  } catch {
    return { unit: 'INCH' as const, values: {} as Record<string, string> }
  }
}

function MeasureEditor({
  garment,
  fields,
  payload,
  onChange,
  radioPrefix,
}: {
  garment: Garment
  fields: MeasurementFieldDef[]
  payload: MeasurementPayload
  onChange: (next: MeasurementPayload) => void
  radioPrefix: string
}) {
  const groups = useMemo(() => groupFields(fields || []), [fields])
  const groupNames = useMemo(() => Object.keys(groups), [groups])

  return (
    <>
      <div className="unit-toggle">
        <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', color: 'var(--muted)' }}>Unit</span>
        <label>
          <input
            type="radio"
            name={`${radioPrefix}${garment}`}
            value="INCH"
            checked={payload.unit === 'INCH'}
            onChange={() => onChange({ ...payload, unit: 'INCH' })}
          />{' '}
          in
        </label>
        <label>
          <input
            type="radio"
            name={`${radioPrefix}${garment}`}
            value="CM"
            checked={payload.unit === 'CM'}
            onChange={() => onChange({ ...payload, unit: 'CM' })}
          />{' '}
          cm
        </label>
      </div>

      {groupNames.map((gn) => (
        <div key={gn}>
          <div className="measurement-group-title">{gn}</div>
          <div className="form-grid two">
            {(groups[gn] || []).map((f) => {
              const v = payload.values[f.key] != null ? String(payload.values[f.key]) : ''
              return (
                <div key={f.key}>
                  <label>{f.label}</label>
                  {f.hint ? <p className="field-hint">{f.hint}</p> : null}
                  <input
                    type="text"
                    inputMode="decimal"
                    value={v}
                    placeholder={placeholderFor(payload.unit, f.label)}
                    onChange={(e) => onChange({ ...payload, values: { ...payload.values, [f.key]: e.target.value } })}
                  />
                </div>
              )
            })}
          </div>
        </div>
      ))}
    </>
  )
}

export default memo(function CustomerPage() {
  const [sp] = useSearchParams()
  const cid = sp.get('id') ? Number(sp.get('id')) : null
  const nav = useNavigate()
  const toast = useAppToast()

  const [templates, setTemplates] = useState<TemplatesMap>({})
  const [customer, setCustomer] = useState<any | null>(null)
  const [orders, setOrders] = useState<any[]>([])

  const [activeGarment, setActiveGarment] = useState<Garment>('SHIRT')
  const [activePayload, setActivePayload] = useState<MeasurementPayload>({ unit: 'INCH', values: {} })
  const [activeLoading, setActiveLoading] = useState(false)

  // New customer draft
  const [newUnit, setNewUnit] = useState<'INCH' | 'CM'>('INCH')
  const [newDraft, setNewDraft] = useState<Record<Garment, MeasurementPayload>>(() => ({
    SHIRT: { unit: 'INCH', values: {} },
    PANT: { unit: 'INCH', values: {} },
    BLOUSE: { unit: 'INCH', values: {} },
    SUIT: { unit: 'INCH', values: {} },
  }))
  const [newActiveGarment, setNewActiveGarment] = useState<Garment>('SHIRT')

  useEffect(() => {
    let alive = true
    ;(async () => {
      let t: TemplatesMap = {}
      try {
        t = (await appService.customers.templates()) as TemplatesMap
      } catch {
        t = {}
      }
      if (!alive) return
      setTemplates(t || {})
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    ;(async () => {
      if (!cid) return
      let c: any
      try {
        c = await appService.customers.get(cid)
      } catch {
        if (alive) setCustomer(null)
        return
      }
      if (!alive) return
      setCustomer(c)
      try {
        const o = await appService.customers.orders(cid)
        if (!alive) return
        setOrders(o || [])
      } catch {
        if (alive) setOrders([])
      }
    })()
    return () => {
      alive = false
    }
  }, [cid])

  const loadMeasurement = useCallback(
    async (g: Garment) => {
      if (!cid) return
      setActiveLoading(true)
      setActiveGarment(g)
      const m = await appService.customers.getMeasurement(cid, g)
      const payload = parsePayloadJson(String(m?.dataJson || '{}'))
      setActivePayload(payload)
      setActiveLoading(false)
    },
    [cid]
  )

  useEffect(() => {
    if (!cid) return
    void loadMeasurement('SHIRT')
  }, [cid, loadMeasurement])

  const saveMeasurement = useCallback(async () => {
    if (!cid) return
    const g = activeGarment
    try {
      await appService.customers.saveMeasurement(cid, g, { unit: activePayload.unit, values: activePayload.values })
      toast.success('Measurements saved')
    } catch {
      toast.error('Could not save measurements. Please try again.')
    }
  }, [activeGarment, activePayload, cid, toast])

  const saveCustomerDetails = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!cid) return
      const fd = new FormData(e.currentTarget)
      const body = {
        name: String(fd.get('name') || ''),
        phone: String(fd.get('phone') || ''),
        address: String(fd.get('address') || ''),
        preferredUnit: String(fd.get('preferredUnit') || 'INCH'),
      }
      try {
        await appService.customers.update(cid, body)
        toast.success('Customer details saved')
      } catch (err: any) {
        const msg = err?.payload?.message || err?.payload?.error || err?.message
        toast.error(msg ? String(msg) : 'Could not save customer details. Please try again.')
      }
    },
    [cid, toast]
  )

  const createCustomer = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const fd = new FormData(e.currentTarget)
    const body = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      address: String(fd.get('address') || ''),
      preferredUnit: String(fd.get('preferredUnit') || 'INCH'),
    }
    let created: any
    try {
      created = await appService.customers.create(body)
    } catch (err: any) {
      const msg = err?.payload?.message || err?.payload?.error || err?.message
      toast.error(msg ? String(msg) : 'Could not save customer. Please try again.')
      return
    }
    const failed: string[] = []
    for (const g of GARMENTS) {
      const d = newDraft[g]
      const hasAny = Object.keys(d.values || {}).some((k) => d.values[k] && String(d.values[k]).trim() !== '')
      if (!hasAny) continue
      try {
        await appService.customers.saveMeasurement(created.id, g, { unit: d.unit, values: d.values })
      } catch {
        failed.push(g)
      }
    }
    if (failed.length) toast.error(`Customer saved. Could not save measurements for: ${failed.join(', ')}.`)
    else toast.success('Customer saved')
    nav(`/app/customer?id=${created.id}`)
  }, [nav, newDraft, toast])

  if (!cid) {
    const g = newActiveGarment
    const payload = newDraft[g] || { unit: newUnit, values: {} }
    const fields = templates[g] || []

    return (
      <div className="panel">
        <div className="panel-header">
          <h2>New customer</h2>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <form className="ts-app-form" style={{ maxWidth: 720 }} onSubmit={createCustomer}>
            <div className="form-grid two">
              <div>
                <label>Name</label>
                <input name="name" type="text" required placeholder="Customer name" />
              </div>
              <div>
                <label>Phone</label>
                <input name="phone" type="tel" required placeholder="Mobile number" />
              </div>
            </div>
            <div>
              <label>Address</label>
              <textarea name="address" placeholder="Optional" />
            </div>
            <div>
              <label>Default measurement unit</label>
              <select
                name="preferredUnit"
                value={newUnit}
                onChange={(e) => {
                  const v = e.target.value === 'CM' ? 'CM' : 'INCH'
                  setNewUnit(v)
                  setNewDraft((prev) => {
                    const next = { ...prev }
                    for (const gg of GARMENTS) {
                      const d = next[gg]
                      const empty = !d.values || !Object.keys(d.values).some((k) => d.values[k] && String(d.values[k]).trim() !== '')
                      if (empty) next[gg] = { ...d, unit: v }
                    }
                    return next
                  })
                }}
              >
                <option value="INCH">Inches (in)</option>
                <option value="CM">Centimetres (cm)</option>
              </select>
            </div>

            <p style={{ margin: '1rem 0 0.35rem', fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)' }}>
              Measurements (optional)
            </p>
            <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: 'var(--muted)' }}>
              Record sizes for the garments you measure today. You can always edit these later.
            </p>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
              {GARMENTS.map((gg) => {
                const on = gg === g
                return (
                  <button
                    key={gg}
                    type="button"
                    className={`btn btn-sm ${on ? 'btn-teal' : 'btn-ghost'}`}
                    onClick={() => setNewActiveGarment(gg)}
                  >
                    {gg}
                  </button>
                )
              })}
            </div>

            <div className="form-grid">
              <MeasureEditor
                garment={g}
                fields={fields}
                payload={payload}
                radioPrefix="nu-"
                onChange={(next) => setNewDraft((prev) => ({ ...prev, [g]: next }))}
              />
              <p style={{ margin: '0.75rem 0 0', fontSize: '0.82rem', color: 'var(--muted)' }}>Optional — add now or later from the customer profile.</p>
            </div>

            <button type="submit" className="btn btn-primary" style={{ marginTop: '1.25rem' }}>
              Save customer
            </button>
          </form>
        </div>
      </div>
    )
  }

  if (!customer) return <p>Customer not found.</p>

  const pu = String(customer.preferredUnit || 'INCH')
  const fields = templates[activeGarment] || []

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <h2>Details</h2>
          <Link className="btn btn-ghost btn-sm" to="/app/customers">
            Back to list
          </Link>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <form className="form-grid ts-app-form" style={{ maxWidth: 560 }} onSubmit={saveCustomerDetails}>
            <div className="form-grid two">
              <div>
                <label>Name</label>
                <input name="name" type="text" required defaultValue={customer.name} />
              </div>
              <div>
                <label>Phone</label>
                <input name="phone" type="tel" required defaultValue={customer.phone} />
              </div>
            </div>
            <div>
              <label>Address</label>
              <textarea name="address" defaultValue={customer.address || ''} />
            </div>
            <div>
              <label>Default measurement unit</label>
              <select name="preferredUnit" defaultValue={pu}>
                <option value="INCH">Inches (in)</option>
                <option value="CM">Centimetres (cm)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">
              Save details
            </button>
          </form>
        </div>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h2>Saved measurements</h2>
          <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--muted)' }}>
            Industry-style fields; values use the unit you select per garment.
          </p>
        </div>
        <div style={{ padding: '1.25rem' }}>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            {GARMENTS.map((g) => {
              const on = g === activeGarment
              return (
                <button
                  key={g}
                  type="button"
                  className={`btn btn-sm ${on ? 'btn-teal' : 'btn-ghost'}`}
                  onClick={() => void loadMeasurement(g)}
                >
                  {g}
                </button>
              )
            })}
          </div>

          <div id="tab-body" className="ts-app-form" style={{ maxWidth: 720 }}>
            {activeLoading ? (
              <p style={{ color: 'var(--muted)' }}>Loading…</p>
            ) : (
              <>
                <MeasureEditor garment={activeGarment} fields={fields} payload={activePayload} radioPrefix="u-" onChange={setActivePayload} />
                <button type="button" className="btn btn-primary" id="saveM" style={{ marginTop: '1rem' }} onClick={() => void saveMeasurement()}>
                  Save {activeGarment}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: '1rem' }}>
        <div className="panel-header">
          <h2>Order history</h2>
        </div>
        <div className="table-wrap">
          <table className="data">
            <thead>
              <tr>
                <th>#</th>
                <th>Garment</th>
                <th>Delivery</th>
                <th>Status</th>
                <th>Total</th>
                <th>Balance</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(orders || []).length === 0 ? (
                <tr>
                  <td colSpan={7}>No orders yet.</td>
                </tr>
              ) : (
                (orders || []).map((o: any) => {
                  const bal = Number(o.totalAmount) - Number(o.advanceAmount || 0)
                  return (
                    <tr key={o.id}>
                      <td>#{o.serialNumber}</td>
                      <td>{o.garmentType}</td>
                      <td>{o.deliveryDate}</td>
                      <td>{o.status}</td>
                      <td>₹{Number(o.totalAmount).toFixed(0)}</td>
                      <td>₹{bal.toFixed(0)}</td>
                      <td>
                        <Link to={`/app/order?id=${o.id}`}>View</Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
})

