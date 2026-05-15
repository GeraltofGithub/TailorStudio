import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { buildMe } from '../services/mePayloadService.js'

export async function getMe(req: AuthedRequest, res: Response) {
  res.json(await buildMe(req.user))
}
