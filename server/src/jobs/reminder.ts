import cron from 'node-cron'
import { TailorOrder } from '../models/TailorOrder.js'
import { Customer, Business } from '../models/index.js'
import { addNotification } from '../services/notificationService.js'
import { parseObjectId } from '../utils/objectId.js'

export function startReminderJob() {
  cron.schedule('0 8 * * *', async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const from = new Date(today)
      from.setDate(from.getDate() + 1)
      const to = new Date(today)
      to.setDate(to.getDate() + 3)
      const fromStr = from.toISOString().slice(0, 10)
      const toStr = to.toISOString().slice(0, 10)

      const orders = await TailorOrder.find({
        deliveryDate: { $gte: fromStr, $lte: toStr },
        status: { $ne: 'DELIVERED' },
      }).lean()

      for (const o of orders) {
        const row = o as Record<string, unknown>
        const businessId = String(row.businessId)
        const deliveryDate = row.deliveryDate as string
        const d = new Date(deliveryDate)
        const days = Math.round((d.getTime() - today.getTime()) / 86_400_000)
        let customerName = 'Customer'
        const cid = row.customerId
        if (cid) {
          const c = await Customer.findById(parseObjectId(String(cid))).lean()
          if (c) customerName = (c as Record<string, string>).name
        }
        const b = await Business.findById(parseObjectId(businessId)).lean()
        if (!b) continue
        const msg = `Delivery in ${days} day(s) (${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}): Order #${row.serialNumber} — ${customerName}`
        await addNotification(businessId, msg, String(row._id))
      }
    } catch (e) {
      console.error('[cron] reminder failed', e)
    }
  })
  console.log('[cron] delivery reminders 08:00 daily')
}
