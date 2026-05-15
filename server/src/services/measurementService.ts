import { Customer, Measurement } from '../models/index.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApi } from '../utils/apiJson.js'
import { fieldsFor } from '../data/measurementTemplates.js'
import { emitCustomersChanged } from '../ws/realtime.js'

function wrapJson(unit: string, values: Record<string, string>) {
  return JSON.stringify({ unit, values })
}

export function normalizeStoredJson(raw: string | null | undefined, defaultUnit: string) {
  if (!raw?.trim()) return wrapJson(defaultUnit, {})
  try {
    const n = JSON.parse(raw) as { unit?: string; values?: Record<string, string> }
    if (n.unit && n.values && typeof n.values === 'object') return JSON.stringify(n)
    const flat: Record<string, string> = {}
    for (const [k, v] of Object.entries(n)) {
      if (k !== 'unit' && v != null && typeof v !== 'object') flat[k] = String(v)
    }
    return wrapJson(defaultUnit, flat)
  } catch {
    return wrapJson(defaultUnit, {})
  }
}

async function verifyCustomer(businessId: string, customerId: string) {
  const c = await Customer.findOne({
    _id: parseObjectId(customerId),
    businessId: parseObjectId(businessId),
  }).lean()
  if (!c) throw new Error('Not found')
  return c
}

export async function listMeasurements(businessId: string, customerId: string) {
  const c = await verifyCustomer(businessId, customerId)
  const cid = parseObjectId(customerId)
  const def = ((c as { preferredUnit?: string }).preferredUnit || 'INCH').toUpperCase()
  const rows = await Measurement.find({ customerId: cid }).sort({ garmentType: 1 }).lean()
  return rows.map((m) => ({
    id: String((m as { _id: unknown })._id),
    garmentType: (m as Record<string, string>).garmentType,
    dataJson: normalizeStoredJson((m as { dataJson?: string }).dataJson, def),
    updatedAt: (m as { updatedAt?: Date }).updatedAt ?? null,
  }))
}

export async function getMeasurement(businessId: string, customerId: string, garment: string) {
  const c = await verifyCustomer(businessId, customerId)
  const cid = parseObjectId(customerId)
  const def = ((c as { preferredUnit?: string }).preferredUnit || 'INCH').toUpperCase()
  const m = await Measurement.findOne({ customerId: cid, garmentType: garment }).sort({ updatedAt: -1 }).lean()
  if (!m) return { id: null, garmentType: garment, dataJson: normalizeStoredJson(null, def), updatedAt: null }
  return {
    id: String((m as { _id: unknown })._id),
    garmentType: garment,
    dataJson: normalizeStoredJson((m as { dataJson?: string }).dataJson, def),
    updatedAt: (m as { updatedAt?: Date }).updatedAt ?? null,
  }
}

export async function saveMeasurement(
  businessId: string,
  customerId: string,
  garment: string,
  body: { unit: string; values: Record<string, string> },
) {
  await verifyCustomer(businessId, customerId)
  const cid = parseObjectId(customerId)
  const unit = body.unit?.trim().toUpperCase()
  if (unit !== 'INCH' && unit !== 'CM') throw new Error('unit must be INCH or CM')
  const json = wrapJson(unit, body.values || {})
  let m = await Measurement.findOne({ customerId: cid, garmentType: garment }).sort({ updatedAt: -1 })
  if (!m) {
    m = new Measurement({
      customerId: cid,
      garmentType: garment,
    })
  }
  m.dataJson = json
  m.updatedAt = new Date()
  await m.save()
  emitCustomersChanged(businessId, customerId, 'updated')
  return toApi(m.toJSON() as Record<string, unknown>)
}

export { fieldsFor }
