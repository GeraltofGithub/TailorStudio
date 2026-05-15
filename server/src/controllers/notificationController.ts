import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import * as svc from '../services/notificationService.js'

export async function list(req: AuthedRequest, res: Response) {
  res.json(await svc.listNotifications(req.user.businessId))
}

export async function unreadCount(req: AuthedRequest, res: Response) {
  res.json({ count: await svc.unreadCount(req.user.businessId) })
}

export async function markRead(req: AuthedRequest, res: Response) {
  try {
    await svc.markRead(req.user.businessId, req.params.id)
    res.json({ ok: true })
  } catch {
    res.status(400).json({ error: 'Not found' })
  }
}

export async function markAllRead(req: AuthedRequest, res: Response) {
  await svc.markAllRead(req.user.businessId)
  res.json({ ok: true })
}
