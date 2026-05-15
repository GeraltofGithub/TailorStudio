import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { isObjectIdString } from './objectId.js'

export function createAccessToken(userId: string) {
  return jwt.sign({ sub: userId }, env.jwtSecret, {
    expiresIn: Math.floor(env.jwtExpirationMs / 1000),
  })
}

export function verifyAccessToken(token: string): string {
  const p = jwt.verify(token, env.jwtSecret) as { sub?: string }
  const id = (p.sub || '').trim()
  if (!isObjectIdString(id)) throw new Error('invalid token')
  return id
}
