import { Customer, TailorOrder } from '../models/index.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApi, toApiList } from '../utils/apiJson.js'
import { emitCustomersChanged } from '../ws/realtime.js'

function searchFilter(businessId: string, q: string | undefined, activeOnly: boolean) {
  const base: Record<string, unknown> = { businessId: parseObjectId(businessId) }
  if (activeOnly) base.active = { $ne: false }
  if (!q?.trim()) return base
  const re = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return { ...base, $or: [{ name: re }, { phone: re }] }
}

const customerListSelect = 'name phone address preferredUnit active createdAt'

export const listCustomers = async (businessId: string, q?: string) =>
  toApiList(
    (await Customer.find(searchFilter(businessId, q, false))
      .select(customerListSelect)
      .sort({ name: 1 })
      .lean()) as Record<string, unknown>[],
  )

export const listActiveCustomers = async (businessId: string, q?: string) =>
  toApiList(
    (await Customer.find(searchFilter(businessId, q, true))
      .select(customerListSelect)
      .sort({ name: 1 })
      .lean()) as Record<string, unknown>[],
  )

export const getCustomer = async (businessId: string, customerId: string) => {
  const c = await Customer.findOne({
    _id: parseObjectId(customerId),
    businessId: parseObjectId(businessId),
  }).lean()
  if (!c) throw new Error('Not found')
  return toApi(c as Record<string, unknown>)
}

export const createCustomer = async (
  businessId: string,
  d: { name: string; phone: string; address?: string; preferredUnit?: string },
) => {
  const doc = await Customer.create({
    businessId: parseObjectId(businessId),
    name: d.name,
    phone: d.phone,
    address: d.address || null,
    preferredUnit: d.preferredUnit?.toUpperCase() === 'CM' ? 'CM' : 'INCH',
    active: true,
  })
  const out = toApi(doc.toJSON() as Record<string, unknown>)!
  emitCustomersChanged(businessId, String(out.id), 'created')
  return out
}

export const updateCustomer = async (
  businessId: string,
  customerId: string,
  d: { name: string; phone: string; address?: string; preferredUnit?: string },
) => {
  const c = await Customer.findOne({
    _id: parseObjectId(customerId),
    businessId: parseObjectId(businessId),
  })
  if (!c) throw new Error('Not found')
  c.name = d.name
  c.phone = d.phone
  c.address = d.address || null
  if (d.preferredUnit) c.preferredUnit = d.preferredUnit.toUpperCase() === 'CM' ? 'CM' : 'INCH'
  await c.save()
  const out = toApi(c.toJSON() as Record<string, unknown>)!
  emitCustomersChanged(businessId, customerId, 'updated')
  return out
}

export const setCustomerActive = async (businessId: string, customerId: string, active: boolean) => {
  const c = await Customer.findOne({
    _id: parseObjectId(customerId),
    businessId: parseObjectId(businessId),
  })
  if (!c) throw new Error('Not found')
  c.active = active
  await c.save()
  const out = toApi(c.toJSON() as Record<string, unknown>)!
  emitCustomersChanged(businessId, customerId, 'updated')
  return out
}

export const customerOrderHistory = async (businessId: string, customerId: string) => {
  await getCustomer(businessId, customerId)
  const rows = await TailorOrder.find({
    businessId: parseObjectId(businessId),
    customerId: parseObjectId(customerId),
  })
    .sort({ createdAt: -1 })
    .lean()
  return toApiList(rows as Record<string, unknown>[])
}
