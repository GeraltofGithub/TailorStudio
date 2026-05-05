import type { MeResponse } from '../authApi/authApi'
import { api } from '../api'
import { setAccessToken } from '../../../utils/authToken'

export type OtpSendOk = { ok: true; expiresAt: string }

export type LoginChallengeOk = { ok: true; expiresAt: string; pendingToken: string; staticOtp?: boolean }

export async function otpLoginChallenge(
  email: string,
  password: string,
  opts?: { signal?: AbortSignal },
): Promise<LoginChallengeOk> {
  return api._post<LoginChallengeOk>('/api/auth/otp/login/challenge', { email, password }, opts)
}

export async function otpLoginResend(pendingToken: string): Promise<OtpSendOk> {
  return api._post<OtpSendOk>('/api/auth/otp/login/resend', { pendingToken })
}

export async function otpLoginVerify(email: string, code: string, pendingToken: string): Promise<MeResponse> {
  const r = await api._post<{ ok: true; me: MeResponse; accessToken?: string }>('/api/auth/otp/login/verify', {
    email,
    code,
    pendingToken,
  })
  const token = r.accessToken
  if (typeof token !== 'string' || token.length < 10) {
    throw new Error(
      'Sign-in succeeded but no access token was returned. Deploy the latest API (JWT) and frontend, then hard-refresh.',
    )
  }
  setAccessToken(token)
  return r.me
}

export async function otpForgotSend(email: string): Promise<OtpSendOk> {
  return api._post<OtpSendOk>('/api/auth/otp/forgot/send', { email })
}

export async function otpForgotVerify(email: string, code: string): Promise<{ ok: true; resetToken: string }> {
  return api._post('/api/auth/otp/forgot/verify', { email, code })
}

export async function otpForgotReset(resetToken: string, newPassword: string): Promise<void> {
  await api._post<undefined>('/api/auth/otp/forgot/reset', { resetToken, newPassword })
}
