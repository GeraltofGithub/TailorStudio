import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { dashboardStats, dashboardSummary } from '../services/dashboardService.js'

export async function stats(req: AuthedRequest, res: Response) {
  res.json(await dashboardStats(req.user.businessId))
}

export async function summary(req: AuthedRequest, res: Response) {
  res.json(await dashboardSummary(req.user.businessId))
}
