import { Business } from '../models/Business.js'
import type { UserDoc } from '../models/User.js'
import { parseObjectId } from '../utils/objectId.js'
import { leanOne } from '../utils/lean.js'

export async function buildMe(user: UserDoc) {
  const b = await Business.findById(parseObjectId(user.businessId))
    .select('name tagline address phone secondaryPhone joinCode')
    .lean()
  if (!b) throw new Error('Business not found')
  const m: Record<string, unknown> = {
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    businessId: String(b._id),
    businessName: leanOne<{ name: string }>(b).name,
    tagline: leanOne<{ tagline?: string }>(b).tagline ?? null,
    address: leanOne<{ address?: string }>(b).address ?? null,
    phone: leanOne<{ phone?: string }>(b).phone ?? null,
    secondaryPhone: leanOne<{ secondaryPhone?: string }>(b).secondaryPhone ?? null,
  }
  if (user.role === 'OWNER') m.joinCode = leanOne<{ joinCode: string }>(b).joinCode
  return m
}
