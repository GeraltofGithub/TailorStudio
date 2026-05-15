import { AppNotification } from '../models/AppNotification.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApiList } from '../utils/apiJson.js'
import { emitToBusiness } from '../ws/socketHub.js'

export async function listNotifications(businessId: string) {
  const rows = await AppNotification.find({ businessId: parseObjectId(businessId) })
    .sort({ createdAt: -1 })
    .lean()
  return toApiList(rows as Record<string, unknown>[])
}

export async function unreadCount(businessId: string) {
  return AppNotification.countDocuments({
    businessId: parseObjectId(businessId),
    readFlag: { $ne: true },
  })
}

export async function markRead(businessId: string, notificationId: string) {
  const n = await AppNotification.findOne({
    _id: parseObjectId(notificationId),
    businessId: parseObjectId(businessId),
  })
  if (!n) throw new Error('Not found')
  n.readFlag = true
  await n.save()
  emitToBusiness(businessId, { type: 'notifications:updated' })
}

export async function markAllRead(businessId: string) {
  await AppNotification.updateMany(
    { businessId: parseObjectId(businessId), readFlag: { $ne: true } },
    { $set: { readFlag: true } },
  )
  emitToBusiness(businessId, { type: 'notifications:updated' })
}

export async function addNotification(businessId: string, message: string, orderId?: string) {
  await AppNotification.create({
    businessId: parseObjectId(businessId),
    message,
    orderId: orderId ? parseObjectId(orderId) : null,
    readFlag: false,
  })
  emitToBusiness(businessId, { type: 'notifications:updated' })
}
