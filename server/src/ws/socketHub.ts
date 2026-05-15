import type { WebSocket } from 'ws'

type Client = { ws: WebSocket; userId: string; businessId: string }

const clients = new Set<Client>()

export function registerClient(ws: WebSocket, userId: string, businessId: string) {
  const c: Client = { ws, userId, businessId }
  clients.add(c)
  ws.on('close', () => clients.delete(c))
}

export function emitToUser(userId: string, payload: object) {
  const data = JSON.stringify(payload)
  for (const c of clients) {
    if (c.userId === userId && c.ws.readyState === 1) c.ws.send(data)
  }
}

export function emitToBusiness(businessId: string, payload: object) {
  const data = JSON.stringify(payload)
  for (const c of clients) {
    if (c.businessId === businessId && c.ws.readyState === 1) c.ws.send(data)
  }
}
