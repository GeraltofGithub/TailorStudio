import { WebSocketServer } from 'ws'
import type { Server } from 'http'
import { verifyAccessToken } from '../utils/jwt.js'
import { User } from '../models/User.js'
import { userFromLean } from '../models/User.js'
import { parseObjectId } from '../utils/objectId.js'
import { registerClient } from './socketHub.js'
import { buildMe } from '../services/mePayloadService.js'
import { leanOne } from '../utils/lean.js'

export function attachWebSocket(server: Server) {
  const wss = new WebSocketServer({ server, path: '/ws' })

  wss.on('connection', async (ws, req) => {
    try {
      const url = new URL(req.url || '', 'http://localhost')
      const token = url.searchParams.get('token') || ''
      const userId = verifyAccessToken(token)
      const raw = await User.findById(parseObjectId(userId)).lean()
      if (!raw) {
        ws.close(4401, 'unauthorized')
        return
      }
      const user = userFromLean(leanOne<Record<string, unknown>>(raw))
      registerClient(ws, user.id, user.businessId)
      const me = await buildMe(user)
      ws.send(JSON.stringify({ type: 'session:ready', me }))

      ws.on('message', async (buf) => {
        try {
          const msg = JSON.parse(buf.toString()) as { type?: string }
          if (msg.type === 'session:ping') {
            const fresh = await User.findById(parseObjectId(user.id)).lean()
            if (!fresh) {
              ws.send(JSON.stringify({ type: 'session:logout' }))
              ws.close()
              return
            }
            const u = userFromLean(leanOne<Record<string, unknown>>(fresh))
            ws.send(JSON.stringify({ type: 'session:ok', me: await buildMe(u) }))
          }
        } catch {
          /* ignore */
        }
      })
    } catch {
      ws.close(4401, 'unauthorized')
    }
  })

  console.log('[ws] /ws ready')
  return wss
}
