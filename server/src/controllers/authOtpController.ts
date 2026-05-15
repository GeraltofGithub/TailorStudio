import type { Request, Response } from 'express'
import * as otp from '../services/otpAuthService.js'
import { buildMe } from '../services/mePayloadService.js'
import { expiresAtIso } from '../utils/apiJson.js'
import type { UserDoc } from '../models/User.js'

export async function loginChallenge(req: Request, res: Response) {
  try {
    const r = await otp.startLoginWithPassword(req.body.email, req.body.password)
    res.json({
      ok: true,
      expiresAt: expiresAtIso(r.expiresAt),
      email: r.email,
      staticOtp: otp.isStaticOtpBypassEnabled(),
    })
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    if (m === 'no_account') return res.status(404).json({ ok: false, error: 'no_account' })
    if (m === 'invalid_credentials') return res.status(401).json({ ok: false, error: 'invalid_credentials' })
    if (m.includes('not configured')) {
      return res.status(503).json({ ok: false, error: 'mail_not_configured', message: m })
    }
    res.status(400).json({ ok: false, error: m })
  }
}

export async function loginResend(req: Request, res: Response) {
  try {
    const exp =
      req.body.password != null && String(req.body.password).length > 0
        ? await otp.resendLoginOtpWithPassword(req.body.email, req.body.password)
        : await otp.resendLoginOtp(req.body.pendingToken)
    res.json({ ok: true, expiresAt: expiresAtIso(exp) })
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    if (m === 'no_account') return res.status(404).json({ ok: false, error: 'no_account' })
    if (m === 'invalid_credentials') return res.status(401).json({ ok: false, error: 'invalid_credentials' })
    if (m === 'invalid_pending') return res.status(400).json({ ok: false, error: 'invalid_pending' })
    if (m.includes('not configured')) {
      return res.status(503).json({ ok: false, error: 'mail_not_configured', message: m })
    }
    res.status(400).json({ ok: false, error: m })
  }
}

async function respondLoginSuccess(res: Response, out: Awaited<ReturnType<typeof otp.completeLoginWithPasswordAndOtp>>) {
  const me = await buildMe(out.user as UserDoc)
  res.json({ ok: true, me, accessToken: out.accessToken })
}

function loginVerifyError(res: Response, e: unknown) {
  const m = e instanceof Error ? e.message : ''
  if (m === 'no_account') return res.status(404).json({ ok: false, error: 'no_account' })
  if (m === 'invalid_credentials') return res.status(401).json({ ok: false, error: 'invalid_credentials' })
  if (m === 'invalid_pending') return res.status(400).json({ ok: false, error: 'invalid_pending' })
  if (m === 'user_not_found') return res.status(400).json({ ok: false, error: 'user_not_found' })
  if (m === 'Business not found') {
    return res.status(503).json({ ok: false, error: 'business_not_found', message: m })
  }
  if (m === 'Document missing numeric id') {
    return res.status(503).json({ ok: false, error: 'legacy_data', message: m })
  }
  const dev = process.env.NODE_ENV !== 'production'
  return res.status(400).json({
    ok: false,
    error: m === 'invalid_otp' ? 'invalid_otp' : m || 'invalid_otp',
    ...(dev && m ? { message: m } : {}),
  })
}

export async function loginComplete(req: Request, res: Response) {
  try {
    const out = await otp.completeLoginWithPasswordAndOtp(
      req.body.email,
      req.body.password,
      req.body.code,
    )
    await respondLoginSuccess(res, out)
  } catch (e) {
    loginVerifyError(res, e)
  }
}

export async function loginVerify(req: Request, res: Response) {
  try {
    const out =
      req.body.password != null && String(req.body.password).length > 0
        ? await otp.completeLoginWithPasswordAndOtp(req.body.email, req.body.password, req.body.code)
        : await otp.verifyLoginOtp(req.body.email, req.body.code, req.body.pendingToken)
    await respondLoginSuccess(res, out)
  } catch (e) {
    loginVerifyError(res, e)
  }
}

export async function forgotSend(req: Request, res: Response) {
  try {
    const exp = await otp.sendForgotPasswordOtp(req.body.email)
    res.json({ ok: true, expiresAt: expiresAtIso(exp) })
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    if (m === 'no_account') return res.status(404).json({ ok: false, error: 'no_account' })
    if (m.includes('not configured')) {
      return res.status(503).json({ ok: false, error: 'mail_not_configured', message: m })
    }
    res.status(400).json({ ok: false, error: m })
  }
}

export async function forgotVerify(req: Request, res: Response) {
  try {
    const resetToken = await otp.verifyForgotOtp(req.body.email, req.body.code)
    res.json({ ok: true, resetToken })
  } catch {
    res.status(400).json({ ok: false, error: 'invalid_otp' })
  }
}

export async function forgotReset(req: Request, res: Response) {
  try {
    await otp.resetPasswordWithToken(req.body.resetToken, req.body.newPassword)
    res.json({ ok: true })
  } catch (e) {
    const m = e instanceof Error ? e.message : ''
    if (m === 'invalid_reset_token') return res.status(400).json({ ok: false, error: 'invalid_reset_token' })
    if (m.includes('8 characters')) {
      return res.status(400).json({ ok: false, error: 'validation', message: m })
    }
    res.status(400).json({ ok: false, error: m })
  }
}
