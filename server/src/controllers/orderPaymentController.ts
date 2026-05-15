import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import * as pay from '../services/orderPaymentService.js'

export async function info(req: AuthedRequest, res: Response) {
  const o = await pay.getOrderForBusiness(req.user.businessId, req.params.orderId)
  res.json(pay.paymentInfo(o))
}

export async function cash(req: AuthedRequest, res: Response) {
  try {
    res.json(await pay.recordCash(req.user.businessId, req.params.orderId, req.body.amount))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function markPaid(req: AuthedRequest, res: Response) {
  const method = String(req.query.method || 'CASH')
  res.json(await pay.markPaidInFull(req.user.businessId, req.params.orderId, method))
}

export async function phonePeInitiate(req: AuthedRequest, res: Response) {
  try {
    res.json(await pay.initiatePhonePe(req.user.businessId, req.params.orderId))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function phonePeSync(req: AuthedRequest, res: Response) {
  try {
    res.json(await pay.syncPhonePe(req.user.businessId, req.params.orderId))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}
