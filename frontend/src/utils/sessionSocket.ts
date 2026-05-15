import { getAccessToken } from './authToken'

type Handler = (msg: { type: string; me?: unknown; orderId?: string; customerId?: string; action?: string }) => void

let socket: WebSocket | null = null
let handlers = new Set<Handler>()

function wsUrl() {
  const base = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() || ''
  if (base) {
    const u = new URL(base)
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
    u.pathname = '/ws'
    u.search = ''
    return u.toString()
  }
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${location.host}/ws`
}

export function connectSessionSocket() {
  const token = getAccessToken()
  if (!token) return
  disconnectSessionSocket()
  const url = `${wsUrl()}?token=${encodeURIComponent(token)}`
  socket = new WebSocket(url)
  socket.onmessage = (ev) => {
    try {
      const msg = JSON.parse(String(ev.data)) as { type: string; me?: unknown }
      handlers.forEach((h) => h(msg))
    } catch {
      /* ignore */
    }
  }
  socket.onclose = () => {
    socket = null
  }
}

export function disconnectSessionSocket() {
  socket?.close()
  socket = null
}

export function onSessionSocket(h: Handler) {
  handlers.add(h)
  return () => handlers.delete(h)
}

export function pingSessionSocket() {
  if (socket?.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify({ type: 'session:ping' }))
  }
}
