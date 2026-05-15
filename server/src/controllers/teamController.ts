import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { User } from '../models/User.js'
import { parseObjectId } from '../utils/objectId.js'
import { toApiList } from '../utils/apiJson.js'

export async function listTeam(req: AuthedRequest, res: Response) {
  const rows = await User.find({ businessId: parseObjectId(req.user.businessId) })
    .select('id fullName email role createdAt')
    .sort({ createdAt: 1 })
    .lean()
  res.json(toApiList(rows as Record<string, unknown>[]))
}
