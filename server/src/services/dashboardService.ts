import { TailorOrder } from '../models/TailorOrder.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApiList } from '../utils/apiJson.js'

function todayRange() {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  const now = new Date()
  const start = new Date(now.toLocaleString('en-US', { timeZone: zone }))
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start, end }
}

async function statsFacet(businessId: string) {
  const bid = parseObjectId(businessId)
  const { start, end } = todayRange()
  const [row] = await TailorOrder.aggregate([
    { $match: { businessId: bid } },
    {
      $facet: {
        counts: [
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              pendingDeliveries: {
                $sum: { $cond: [{ $ne: ['$status', 'DELIVERED'] }, 1, 0] },
              },
            },
          },
        ],
        dailyIncome: [
          {
            $match: {
              status: 'DELIVERED',
              deliveredAt: { $gte: start, $lt: end },
            },
          },
          { $group: { _id: null, sum: { $sum: '$totalAmount' } } },
        ],
      },
    },
  ])
  const counts = row?.counts?.[0]
  const daily = row?.dailyIncome?.[0]
  return {
    totalOrders: counts?.totalOrders ?? 0,
    pendingDeliveries: counts?.pendingDeliveries ?? 0,
    dailyIncome: daily?.sum ?? 0,
  }
}

async function fetchRecentOrders(businessId: string, limit: number) {
  const bid = parseObjectId(businessId)
  const rows = await TailorOrder.aggregate([
    { $match: { businessId: bid } },
    { $sort: { createdAt: -1 } },
    { $limit: limit },
    {
      $lookup: {
        from: 'customers',
        localField: 'customerId',
        foreignField: '_id',
        as: '_c',
        pipeline: [{ $project: { name: 1 } }],
      },
    },
    {
      $project: {
        _id: 1,
        serialNumber: 1,
        garmentType: 1,
        deliveryDate: 1,
        status: 1,
        customer: {
          $let: {
            vars: { c: { $arrayElemAt: ['$_c', 0] } },
            in: { _id: '$$c._id', name: '$$c.name' },
          },
        },
      },
    },
  ])
  return toApiList(rows as Record<string, unknown>[])
}

export async function dashboardStats(businessId: string) {
  return statsFacet(businessId)
}

export async function dashboardSummary(businessId: string) {
  const [stats, recentOrders] = await Promise.all([statsFacet(businessId), fetchRecentOrders(businessId, 8)])
  return { stats, recentOrders }
}
