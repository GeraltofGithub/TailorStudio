import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import * as svc from '../services/orderService.js'

export async function list(req: AuthedRequest, res: Response) {
  res.json(await svc.listOrders(req.user.businessId))
}

export async function get(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.getOrder(req.user.businessId, req.params.id))
  } catch {
    res.status(400).json({ error: 'Not found' })
  }
}

export async function create(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.createOrder(req.user.businessId, req.body))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function update(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.updateOrder(req.user.businessId, req.params.id, req.body))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}
