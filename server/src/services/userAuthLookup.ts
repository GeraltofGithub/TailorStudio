import { User } from '../models/User.js'
import type { UserDoc } from '../models/User.js'
import { userFromLean } from '../models/User.js'
import { leanOne } from '../utils/lean.js'

export async function findByEmailFlexible(emailRaw: string): Promise<UserDoc | null> {
  const t = emailRaw?.trim()
  if (!t) return null
  const n = t.toLowerCase()
  const u = await User.findOne({
    $or: [{ email: n }, { email: new RegExp(`^${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }],
  })
    .select('+passwordHash')
    .lean()
  if (!u) return null
  return userFromLean(leanOne<Record<string, unknown>>(u))
}
