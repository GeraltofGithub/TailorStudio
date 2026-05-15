import type { Request, Response, NextFunction } from 'express'

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  const msg = err instanceof Error ? err.message : 'internal_server_error'
  console.error(`[API] ${req.method} ${req.path}`, err)
  if (res.headersSent) return
  if (msg.includes('not configured') || msg.includes('mail')) {
    res.status(503).json({ error: 'mail_send_failed', message: msg })
    return
  }
  res.status(500).json({ error: 'internal_server_error', message: 'An unexpected error occurred. Please try again later.' })
}
