import type { Response } from 'express'
import type { AuthedRequest } from '../middleware/auth.js'
import { Business } from '../models/Business.js'
import { rotateJoinCode } from '../services/authService.js'
import { parseObjectId } from '../utils/objectId.js'

export async function patchBusiness(req: AuthedRequest, res: Response) {
  const b = await Business.findById(parseObjectId(req.user.businessId))
  if (!b) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  const body = req.body as Record<string, string | undefined>
  if (body.name?.trim()) b.name = body.name.trim()
  if (body.tagline !== undefined) b.tagline = body.tagline?.trim() || null
  if (body.address !== undefined) b.address = body.address?.trim() || null
  if (body.phone !== undefined) b.phone = body.phone?.trim() || null
  if (body.secondaryPhone !== undefined) b.secondaryPhone = body.secondaryPhone?.trim() || null
  await b.save()
  res.json({ ok: 'true' })
}

export async function rotateCode(req: AuthedRequest, res: Response) {
  if (req.user.role !== 'OWNER') {
    res.status(400).json({ error: 'Only owners can rotate the code' })
    return
  }
  const joinCode = await rotateJoinCode(req.user.businessId)
  res.json({ joinCode })
}
