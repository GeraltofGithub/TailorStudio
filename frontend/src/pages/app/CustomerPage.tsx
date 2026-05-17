import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { appService } from '../../services/appService'
import { publishCustomersChanged } from '../../services/businessRealtime'
import { idFromApi } from '../../utils/apiId'
import { useAppToast } from '../../utils/toast'
import { User, Ruler, History, Save, ChevronLeft } from 'lucide-react'

type Garment =
  | 'SHIRT'
  | 'PANT'
  | 'BLOUSE'
  | 'SUIT'
  | 'KURTA'
  | 'SHERWANI'
  | 'INDO_WESTERN'
  | 'NEHRU_JACKET'
  | 'WAISTCOAT'
  | 'JODHPURI'
  | 'ACCESSORIES'

const GARMENTS: Garment[] = [
  'SHIRT',
  'PANT',
  'BLOUSE',
  'SUIT',
  'KURTA',
  'SHERWANI',
  'INDO_WESTERN',
  'NEHRU_JACKET',
  'WAISTCOAT',
  'JODHPURI',
  'ACCESSORIES',
]

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

function isOptionalField(f: MeasurementFieldDef) {
  const g = (f.group || '').toLowerCase()
  const h = (f.hint || '').toLowerCase()
  const l = (f.label || '').toLowerCase()
  return g.includes('optional') || h.includes('optional') || l.includes('(optional)')
}

function missingRequiredFields(fields: MeasurementFieldDef[], payload: MeasurementPayload) {
  const vals = payload?.values || {}
  const missing: MeasurementFieldDef[] = []
  for (const f of fields || []) {
    if (isOptionalField(f)) continue
    const v = vals[f.key]
    if (v == null || String(v).trim() === '') missing.push(f)
  }
  return missing
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
                  <label>
                    {f.label}
                    <span className="req-star">*</span>
                  </label>
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
  const cid = sp.get('id') || null
  const nav = useNavigate()
  const toast = useAppToast()
  const [creatingCustomer, setCreatingCustomer] = useState(false)
  const [savingDetails, setSavingDetails] = useState(false)
  const [savingMeasurements, setSavingMeasurements] = useState(false)

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
    KURTA: { unit: 'INCH', values: {} },
    SHERWANI: { unit: 'INCH', values: {} },
    INDO_WESTERN: { unit: 'INCH', values: {} },
    NEHRU_JACKET: { unit: 'INCH', values: {} },
    WAISTCOAT: { unit: 'INCH', values: {} },
    JODHPURI: { unit: 'INCH', values: {} },
    ACCESSORIES: { unit: 'INCH', values: {} },
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
      try {
        const m = await appService.customers.getMeasurement(cid, g)
        setActivePayload(parsePayloadJson(String(m?.dataJson || '{}')))
      } catch {
        const unit = (customer?.preferredUnit === 'CM' ? 'CM' : 'INCH') as 'INCH' | 'CM'
        setActivePayload({ unit, values: {} })
      } finally {
        setActiveLoading(false)
      }
    },
    [cid, customer?.preferredUnit]
  )

  useEffect(() => {
    if (!cid) return
    void loadMeasurement('SHIRT')
  }, [cid, loadMeasurement])

  const activeFields = useMemo(() => templates[activeGarment] || [], [activeGarment, templates])

  const saveMeasurement = useCallback(async () => {
    if (!cid) return
    if (savingMeasurements) return
    setSavingMeasurements(true)
    const g = activeGarment
    const reqMissing = missingRequiredFields(activeFields || [], activePayload)
    if (reqMissing.length) {
      toast.error(`Please fill required fields: ${reqMissing.slice(0, 4).map((x) => x.label).join(', ')}${reqMissing.length > 4 ? '…' : ''}`)
      setSavingMeasurements(false)
      return
    }
    try {
      const saved = await appService.customers.saveMeasurement(cid, g, {
        unit: activePayload.unit,
        values: activePayload.values,
      })
      if (saved?.dataJson) {
        setActivePayload(parsePayloadJson(String(saved.dataJson)))
      } else {
        await loadMeasurement(g)
      }
      toast.success('Measurements saved')
    } catch {
      toast.error('Could not save measurements. Please try again.')
    } finally {
      setSavingMeasurements(false)
    }
  }, [activeFields, activeGarment, activePayload, cid, loadMeasurement, savingMeasurements, toast])

  const saveCustomerDetails = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      if (!cid) return
      if (savingDetails) return
      setSavingDetails(true)
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
      } finally {
        setSavingDetails(false)
      }
    },
    [cid, savingDetails, toast]
  )

  const createCustomer = useCallback(async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (creatingCustomer) return
    setCreatingCustomer(true)
    const fd = new FormData(e.currentTarget)
    const body = {
      name: String(fd.get('name') || '').trim(),
      phone: String(fd.get('phone') || '').trim(),
      address: String(fd.get('address') || ''),
      preferredUnit: String(fd.get('preferredUnit') || 'INCH'),
    }
    let created: { id?: string; _id?: string } | null = null
    try {
      created = await appService.customers.create(body)
    } catch (err: any) {
      const msg = err?.payload?.message || err?.payload?.error || err?.message
      toast.error(msg ? String(msg) : 'Could not save customer. Please try again.')
      setCreatingCustomer(false)
      return
    }
    const newCustomerId = idFromApi(created)
    if (!newCustomerId) {
      toast.error('Customer saved but id was missing. Open the customer from the list.')
      setCreatingCustomer(false)
      return
    }
    const failed: string[] = []
    for (const g of GARMENTS) {
      const d = newDraft[g]
      const hasAny = Object.keys(d.values || {}).some((k) => d.values[k] && String(d.values[k]).trim() !== '')
      if (!hasAny) continue
      try {
        await appService.customers.saveMeasurement(newCustomerId, g, { unit: d.unit, values: d.values })
      } catch {
        failed.push(g)
      }
    }
    if (failed.length) toast.error(`Customer saved. Could not save measurements for: ${failed.join(', ')}.`)
    else toast.success('Customer saved')
    publishCustomersChanged({ customerId: newCustomerId, action: 'created' })
    nav(`/app/customer?id=${newCustomerId}`)
    setCreatingCustomer(false)
  }, [creatingCustomer, nav, newDraft, toast])

  if (!cid) {
    const g = newActiveGarment
    const payload = newDraft[g] || { unit: newUnit, values: {} }
    const fields = templates[g] || []

    return (
      <div className="order-form-premium" style={{ maxWidth: 900, margin: '0 auto' }}>
        <div className="panel-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: '1rem 0 0' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}><User size={24} style={{ marginRight: '0.5rem' }}/> New Customer</h2>
          <Link className="btn btn-ghost btn-sm" to="/app/customers">
            <ChevronLeft size={16} /> Back
          </Link>
        </div>

        <form className="order-grid" onSubmit={createCustomer}>
          <div className="order-main-col" style={{ gridColumn: '1 / -1' }}>
            <div className="premium-card">
              <div className="card-header">
                <div className="header-icon"><User size={20} /></div>
                <h3>Personal Details</h3>
              </div>
              <div className="card-body form-grid">
                <div className="form-grid two">
                  <div>
                    <label>Name <span className="req-star">*</span></label>
                    <input name="name" type="text" required placeholder="Customer name" />
                  </div>
                  <div>
                    <label>Phone <span className="req-star">*</span></label>
                    <input name="phone" type="tel" required placeholder="Mobile number" />
                  </div>
                </div>
                <div>
                  <label>Address</label>
                  <textarea name="address" placeholder="Optional" style={{ minHeight: '60px' }} />
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
              </div>
            </div>

            <div className="premium-card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <div className="header-icon"><Ruler size={20} /></div>
                <div>
                  <h3>Measurements <span style={{ fontSize: '0.8rem', fontWeight: 'normal', color: 'var(--muted)' }}>(Optional)</span></h3>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
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
                </div>
              </div>
            </div>

            <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
              <button type="submit" className="btn btn-primary" disabled={creatingCustomer} style={{ padding: '0.75rem 2rem', fontSize: '1.05rem' }}>
                <Save size={18} /> {creatingCustomer ? 'Saving…' : 'Save Customer'}
              </button>
            </div>
          </div>
        </form>

        <style>{`
          .order-form-premium {
            --card-bg: var(--bg-card);
            --card-border: var(--border);
            --header-bg: var(--bg-elevated);
          }
          .premium-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
            overflow: hidden;
          }
          .card-header {
            background: var(--header-bg);
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--card-border);
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }
          .header-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: var(--bg);
            border-radius: 8px;
            color: var(--teal);
            border: 1px solid var(--card-border);
          }
          .card-header h3 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text-h);
            font-family: var(--sans);
          }
          .card-body {
            padding: 1.25rem;
          }
        `}</style>
      </div>
    )
  }

  if (!customer) return <p>Customer not found.</p>

  const pu = String(customer.preferredUnit || 'INCH')
  const fields = activeFields

  return (
      <div className="order-form-premium" style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="panel-header" style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', background: 'transparent', border: 'none', padding: '1rem 0 0' }}>
          <h2 style={{ margin: 0, display: 'flex', alignItems: 'center' }}><User size={24} style={{ marginRight: '0.5rem' }}/> {customer.serialNumber ? `CUS_${String(customer.serialNumber).padStart(3, '0')}` : 'Customer Details'}</h2>
          <Link className="btn btn-ghost btn-sm" to="/app/customers">
            <ChevronLeft size={16} /> Back
          </Link>
        </div>

        <div className="order-grid">
          <div className="order-main-col">
            <div className="premium-card">
              <div className="card-header">
                <div className="header-icon"><User size={20} /></div>
                <h3>Personal Details</h3>
              </div>
              <div className="card-body">
                <form className="form-grid" onSubmit={saveCustomerDetails}>
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
                    <textarea name="address" defaultValue={customer.address || ''} style={{ minHeight: '60px' }} />
                  </div>
                  <div className="form-grid two">
                    <div>
                      <label>Default measurement unit</label>
                      <select name="preferredUnit" defaultValue={pu}>
                        <option value="INCH">Inches (in)</option>
                        <option value="CM">Centimetres (cm)</option>
                      </select>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                      <button type="submit" className="btn btn-primary" disabled={savingDetails} style={{ width: '100%', padding: '0.65rem' }}>
                        <Save size={16} /> {savingDetails ? 'Saving…' : 'Save Details'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            <div className="premium-card" style={{ marginTop: '1.5rem' }}>
              <div className="card-header">
                <div className="header-icon"><Ruler size={20} /></div>
                <div>
                  <h3>Measurements</h3>
                </div>
              </div>
              <div className="card-body">
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
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

                <div id="tab-body" className="ts-app-form">
                  {activeLoading ? (
                    <p style={{ color: 'var(--muted)', padding: '2rem 0', textAlign: 'center' }}>Loading measurements…</p>
                  ) : (
                    <>
                      <MeasureEditor garment={activeGarment} fields={fields} payload={activePayload} radioPrefix="u-" onChange={setActivePayload} />
                      <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                        <button
                          type="button"
                          className="btn btn-primary"
                          id="saveM"
                          disabled={savingMeasurements}
                          onClick={() => void saveMeasurement()}
                          style={{ padding: '0.65rem 1.5rem' }}
                        >
                          <Save size={16} /> {savingMeasurements ? 'Saving…' : `Save ${activeGarment}`}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="order-side-col">
            <div className="premium-card">
              <div className="card-header">
                <div className="header-icon"><History size={20} /></div>
                <h3>Order History</h3>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <table className="data" style={{ margin: 0, width: '100%' }}>
                  <thead style={{ background: 'var(--bg)' }}>
                    <tr>
                      <th style={{ paddingLeft: '1.25rem' }}>Order</th>
                      <th>Status</th>
                      <th style={{ paddingRight: '1.25rem', textAlign: 'right' }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(orders || []).length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: '2rem 1.25rem', textAlign: 'center', color: 'var(--muted)' }}>No orders yet.</td>
                      </tr>
                    ) : (
                      (orders || []).map((o: any) => {
                        return (
                          <tr key={o.id} style={{ cursor: 'pointer' }} onClick={() => nav(`/app/order?id=${o.id}`)}>
                            <td style={{ paddingLeft: '1.25rem' }}>
                              <div style={{ fontWeight: 600 }}>OD_{String(o.serialNumber).padStart(3, '0')}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{o.garmentType}</div>
                            </td>
                            <td>
                              <span style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem', background: 'var(--bg)', borderRadius: '4px', border: '1px solid var(--border)' }}>
                                {String(o.status).replace('_', ' ')}
                              </span>
                            </td>
                            <td style={{ paddingRight: '1.25rem', textAlign: 'right' }}>₹{Number(o.totalAmount).toFixed(0)}</td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <style>{`
          .order-form-premium {
            --card-bg: var(--bg-card);
            --card-border: var(--border);
            --header-bg: var(--bg-elevated);
          }

          .order-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 1.5rem;
            align-items: start;
          }

          @media (min-width: 900px) {
            .order-grid {
              grid-template-columns: 1fr 380px;
            }
          }

          .premium-card {
            background: var(--card-bg);
            border: 1px solid var(--card-border);
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.03);
            overflow: hidden;
          }

          .card-header {
            background: var(--header-bg);
            padding: 1rem 1.25rem;
            border-bottom: 1px solid var(--card-border);
            display: flex;
            align-items: center;
            gap: 0.75rem;
          }

          .header-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 32px;
            height: 32px;
            background: var(--bg);
            border-radius: 8px;
            color: var(--teal);
            border: 1px solid var(--card-border);
          }

          .card-header h3 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--text-h);
            font-family: var(--sans);
          }

          .card-body {
            padding: 1.25rem;
          }
          
          .data tbody tr:hover {
            background-color: var(--bg-card-hover);
          }
        `}</style>
      </div>
  )
})

