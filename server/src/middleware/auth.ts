import type { Request, Response, NextFunction } from 'express'
import { User } from '../models/User.js'
import type { UserDoc } from '../models/User.js'
import { userFromLean } from '../models/User.js'
import { verifyAccessToken } from '../utils/jwt.js'
import { parseObjectId } from '../utils/objectId.js'
import { leanOne } from '../utils/lean.js'

export type AuthedRequest = Request & { user: UserDoc }

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'unauthorized' })
    return
  }
  try {
    const userId = verifyAccessToken(h.slice(7).trim())
    const raw = await User.findById(parseObjectId(userId)).select('+passwordHash').lean()
    if (!raw) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    ;(req as AuthedRequest).user = userFromLean(leanOne<Record<string, unknown>>(raw))
    next()
  } catch {
    res.status(401).json({ error: 'unauthorized' })
  }
}

export function requireOwner(req: Request, res: Response, next: NextFunction) {
  const u = (req as AuthedRequest).user
  if (u.role !== 'OWNER') {
    res.status(403).send('Forbidden')
    return
  }
  next()
}
