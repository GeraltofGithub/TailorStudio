import { Customer, TailorOrder } from '../models/index.js'
import { nextSeq } from '../utils/sequence.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApi, toApiList } from '../utils/apiJson.js'
import { emitOrdersChanged } from '../ws/realtime.js'

type LineDto = { description?: string; rate?: number; amount?: number }
type OrderWrite = {
  customerId: string
  garmentType: string
  measurementSnapshot?: Record<string, unknown>
  orderDate: string
  deliveryDate: string
  status?: string
  advanceAmount?: number
  notes?: string
  materialsNotes?: string
  demandsNotes?: string
  lines?: LineDto[]
}

function sumLines(lines: { amount?: number }[]) {
  return lines.reduce((s, l) => s + (l.amount ?? 0), 0)
}

function applyLines(lines: LineDto[] | undefined) {
  const out: { description: string; rate: number; amount: number }[] = []
  for (const dto of lines || []) {
    if (!dto?.description?.trim()) continue
    out.push({
      description: dto.description.trim(),
      rate: dto.rate ?? 0,
      amount: dto.amount ?? 0,
    })
  }
  return out
}

async function attachCustomer(order: Record<string, unknown>, customer?: Record<string, unknown> | null) {
  if (customer) {
    order.customer = toApi(customer)!
    return order
  }
  if (order.customerId) {
    const c = await Customer.findById(parseObjectId(String(order.customerId)))
      .select('name phone address preferredUnit active')
      .lean()
    if (c) order.customer = toApi(c as Record<string, unknown>)
  }
  return order
}

export async function listOrders(businessId: string) {
  const bid = parseObjectId(businessId)
  const rows = await TailorOrder.find({ businessId: bid })
    .select(
      '_id serialNumber customerId garmentType orderDate deliveryDate status totalAmount advanceAmount createdAt',
    )
    .sort({ createdAt: -1 })
    .lean()
  const customerIds = [
    ...new Set(rows.map((r) => String((r as { customerId?: unknown }).customerId)).filter(Boolean)),
  ]
  const customers =
    customerIds.length > 0
      ? await Customer.find({
          businessId: bid,
          _id: { $in: customerIds.map((id) => parseObjectId(id)) },
        })
          .select('name phone')
          .lean()
      : []
  const cmap = new Map(
    customers.map((c) => [String((c as { _id: unknown })._id), toApi(c as Record<string, unknown>)]),
  )
  return toApiList(
    rows.map((r) => {
      const o = { ...(r as Record<string, unknown>) }
      o.customer = cmap.get(String(o.customerId)) ?? null
      return o
    }),
  )
}

export async function getOrder(businessId: string, orderId: string) {
  const o = await TailorOrder.findOne({
    _id: parseObjectId(orderId),
    businessId: parseObjectId(businessId),
  }).lean()
  if (!o) throw new Error('Not found')
  return toApi(await attachCustomer({ ...(o as Record<string, unknown>) }))!
}

export async function createOrder(businessId: string, req: OrderWrite) {
  if (!req.customerId || !req.orderDate || !req.deliveryDate) {
    throw new Error('Customer, order date and delivery date are required')
  }
  const bid = parseObjectId(businessId)
  const customer = await Customer.findOne({
    _id: parseObjectId(req.customerId),
    businessId: bid,
  }).lean()
  if (!customer) throw new Error('Invalid customer')
  const lines = applyLines(req.lines)
  const total = sumLines(lines)
  const doc = await TailorOrder.create({
    businessId: bid,
    serialNumber: await nextSeq(`orderSerial:${businessId}`),
    customerId: parseObjectId(String(customer._id)),
    garmentType: req.garmentType,
    measurementSnapshotJson: JSON.stringify(req.measurementSnapshot ?? {}),
    orderDate: req.orderDate,
    deliveryDate: req.deliveryDate,
    status: req.status || 'PENDING',
    advanceAmount: req.advanceAmount ?? 0,
    notes: req.notes ?? null,
    materialsNotes: req.materialsNotes?.trim() || null,
    demandsNotes: req.demandsNotes?.trim() || null,
    lines,
    totalAmount: total,
    deliveredAt: req.status === 'DELIVERED' ? new Date() : null,
  })
  const raw = doc.toJSON() as Record<string, unknown>
  const out = toApi(await attachCustomer(raw, customer as Record<string, unknown>))!
  emitOrdersChanged(businessId, String(out.id), 'created')
  return out
}

export async function updateOrder(businessId: string, orderId: string, req: OrderWrite) {
  if (!req.customerId || !req.orderDate || !req.deliveryDate) {
    throw new Error('Customer, order date and delivery date are required')
  }
  const bid = parseObjectId(businessId)
  const order = await TailorOrder.findOne({ _id: parseObjectId(orderId), businessId: bid })
  if (!order) throw new Error('Not found')
  const prev = order.status
  const customer = await Customer.findOne({
    _id: parseObjectId(req.customerId),
    businessId: bid,
  }).lean()
  if (!customer) throw new Error('Invalid customer')
  const lines = applyLines(req.lines)
  order.customerId = parseObjectId(String(customer._id))
  order.garmentType = req.garmentType
  order.measurementSnapshotJson = JSON.stringify(req.measurementSnapshot ?? {})
  order.orderDate = req.orderDate
  order.deliveryDate = req.deliveryDate
  if (req.status) order.status = req.status
  order.advanceAmount = req.advanceAmount ?? 0
  order.notes = req.notes ?? null
  order.materialsNotes = req.materialsNotes?.trim() || null
  order.demandsNotes = req.demandsNotes?.trim() || null
  order.lines = lines
  order.totalAmount = sumLines(lines)
  if (prev !== 'DELIVERED' && order.status === 'DELIVERED') order.deliveredAt = new Date()
  else if (order.status !== 'DELIVERED') order.deliveredAt = null
  await order.save()
  const raw = order.toJSON() as Record<string, unknown>
  const out = toApi(await attachCustomer(raw, customer as Record<string, unknown>))!
  emitOrdersChanged(businessId, orderId, 'updated')
  return out
}
