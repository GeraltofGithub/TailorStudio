import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import * as svc from '../services/measurementService.js'
import { allTemplates, fieldsFor } from '../data/measurementTemplates.js'

function measureError(res: Response, e: unknown) {
  const m = e instanceof Error ? e.message : ''
  if (m === 'Not found') return res.status(404).json({ error: 'not_found' })
  if (m === 'invalid id') return res.status(400).json({ error: 'invalid_id' })
  return res.status(400).json({ error: m || 'bad_request' })
}

export async function listForCustomer(req: AuthedRequest, res: Response) {
  try {
    res.json(await svc.listMeasurements(req.user.businessId, req.params.customerId))
  } catch (e) {
    measureError(res, e)
  }
}

export async function getGarment(req: AuthedRequest, res: Response) {
  try {
    const garment = decodeURIComponent(req.params.garment || '')
    res.json(await svc.getMeasurement(req.user.businessId, req.params.customerId, garment))
  } catch (e) {
    measureError(res, e)
  }
}

export async function saveGarment(req: AuthedRequest, res: Response) {
  try {
    const garment = decodeURIComponent(req.params.garment || '')
    res.json(await svc.saveMeasurement(req.user.businessId, req.params.customerId, garment, req.body))
  } catch (e) {
    measureError(res, e)
  }
}

export function allTemplatesHandler(_req: AuthedRequest, res: Response) {
  res.json(allTemplates())
}

export function garmentTemplate(req: AuthedRequest, res: Response) {
  res.json(fieldsFor(req.params.garment))
}
