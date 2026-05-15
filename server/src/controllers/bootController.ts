import type { Request, Response } from 'express'
import mongoose from 'mongoose'

export function apiRoot(_req: Request, res: Response) {
  res.json({ message: 'Welcome to Tailor Studio Backend' })
}

export function health(_req: Request, res: Response) {
  res.json({ ok: true, status: 'up' })
}

export async function warmup(_req: Request, res: Response) {
  try {
    await mongoose.connection.db?.admin().ping()
    res.json({ ok: true, db: true })
  } catch {
    res.status(503).json({ ok: false, error: 'warmup_failed' })
  }
}

export function welcome(_req: Request, res: Response) {
  res.json({
    ok: true,
    message: 'Tailor Studio API',
    tagline: 'Manage customers, measurements, orders & payments',
  })
}

export function loginPage(_req: Request, res: Response) {
  res.status(401).json({ error: 'unauthorized' })
}
