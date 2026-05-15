import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import * as svc from '../services/customerService.js'

function parseUnit(raw?: string) {
  if (!raw?.trim()) return undefined
  const u = raw.trim().toUpperCase()
  if (u !== 'INCH' && u !== 'CM') throw new Error('preferredUnit must be INCH or CM')
  return u
}

export async function list(req: AuthedRequest, res: Response) {
  res.json(await svc.listCustomers(req.user.businessId, req.query.q as string))
}

export async function listActive(req: AuthedRequest, res: Response) {
  res.json(await svc.listActiveCustomers(req.user.businessId, req.query.q as string))
}

export async function get(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.getCustomer(req.user.businessId, req.params.id))
  } catch {
    res.status(400).json({ error: 'Not found' })
  }
}

export async function orders(req: AuthedRequest, res: Response) {
  res.json(await svc.customerOrderHistory(req.user.businessId, req.params.id))
}

export async function create(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.createCustomer(req.user.businessId, { ...req.body, preferredUnit: parseUnit(req.body.preferredUnit) }))
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function update(req: AuthedRequest, res: Response) {
  try {
    res.json(
      await svc.updateCustomer(req.user.businessId, req.params.id, {
        ...req.body,
        preferredUnit: parseUnit(req.body.preferredUnit),
      }),
    )
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function disable(req: AuthedRequest, res: Response) {
  res.json(await svc.setCustomerActive(req.user.businessId, req.params.id, false))
}

export async function enable(req: AuthedRequest, res: Response) {
  res.json(await svc.setCustomerActive(req.user.businessId, req.params.id, true))
}
