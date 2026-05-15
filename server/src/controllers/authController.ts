import type { Request, Response } from 'express'
import * as auth from '../services/authService.js'

export async function signup(req: Request, res: Response) {
  try {
    await auth.registerStudio(req.body)
    res.json({ ok: true, message: 'Studio created. You can sign in now.' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}

export async function staffSignup(req: Request, res: Response) {
  try {
    await auth.registerStaff(req.body)
    res.json({ ok: true, message: 'Account created. You can sign in now.' })
  } catch (e) {
    res.status(400).json({ error: e instanceof Error ? e.message : 'Bad request' })
  }
}
