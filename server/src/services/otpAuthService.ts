import bcrypt from 'bcryptjs'
import { OtpChallenge, PendingLogin, PasswordResetToken, User } from '../models/index.js'
import { env } from '../config/env.js'
import { isMailConfigured, sendMailAsync } from '../mail/mailer.js'
import * as mail from '../mail/otpEmail.js'
import {
  constantTimeEquals,
  hashOtp,
  isStaticOtp,
  newSixDigitOtp,
  randomTokenHex,
  sha256Hex,
} from '../utils/otp.js'
import { createAccessToken } from '../utils/jwt.js'
import { findByEmailFlexible } from './userAuthLookup.js'
import { updatePasswordForUser } from './authService.js'
import { parseObjectId } from '../utils/objectId.js'
import type { UserDoc } from '../models/User.js'
import { userFromLean } from '../models/User.js'
import { leanOne } from '../utils/lean.js'

const OTP_MS = 120_000
const RESET_MS = 900_000
const norm = (e: string) => e.trim().toLowerCase()

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function requireMail() {
  if (!env.staticOtpEnabled && !isMailConfigured()) {
    throw new Error('Email is not configured (set EMAIL and EMAIL_PASSWORD).')
  }
}

async function saveChallenge(email: string, purpose: string, code: string) {
  const emailKey = norm(email)
  await OtpChallenge.deleteMany({ email: emailKey, purpose })
  const expiresAt = new Date(Date.now() + OTP_MS)
  await OtpChallenge.create({ email: emailKey, purpose, codeHash: hashOtp(emailKey, code), expiresAt })
  return expiresAt
}

async function findLoginChallenge(email: string) {
  const emailKey = norm(email)
  return OtpChallenge.findOne({
    email: { $regex: new RegExp(`^${escapeRegex(emailKey)}$`, 'i') },
    purpose: 'LOGIN',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean()
}

async function assertCredentials(emailRaw: string, password: string): Promise<UserDoc> {
  const user = await findByEmailFlexible(emailRaw)
  if (!user) throw new Error('no_account')
  if (!(await bcrypt.compare(password, user.passwordHash))) throw new Error('invalid_credentials')
  return user
}

function issueLoginSession(user: UserDoc) {
  if (!user.id) throw new Error('user_not_found')
  return { user, accessToken: createAccessToken(user.id) }
}

async function checkLoginOtpForUser(user: UserDoc, codeRaw: unknown) {
  const email = norm(user.email)
  const digits = String(codeRaw ?? '').replace(/\D/g, '')
  if (digits.length !== 6) throw new Error('invalid_otp')

  if (isStaticOtp(digits)) {
    await OtpChallenge.deleteMany({ email, purpose: 'LOGIN' })
    return issueLoginSession(user)
  }

  const c = await findLoginChallenge(email)
  if (!c || !constantTimeEquals(leanOne<{ codeHash: string }>(c).codeHash, hashOtp(email, digits))) {
    throw new Error('invalid_otp')
  }
  await OtpChallenge.deleteOne({ _id: leanOne<{ _id: unknown }>(c)._id })
  return issueLoginSession(user)
}

export { isMailConfigured }
export const isStaticOtpBypassEnabled = () => env.staticOtpEnabled

export async function startLoginWithPassword(emailRaw: string, password: string) {
  requireMail()
  const user = await assertCredentials(emailRaw, password)
  const email = norm(user.email)
  let expiresAt = new Date(Date.now() + OTP_MS)
  if (env.staticOtpEnabled) {
    expiresAt = await saveChallenge(email, 'LOGIN', env.staticOtp)
  } else {
    const code = newSixDigitOtp()
    expiresAt = await saveChallenge(email, 'LOGIN', code)
    sendMailAsync({
      to: user.email,
      subject: 'Tailor Studio — sign-in code',
      text: mail.loginPlain(code),
      html: mail.loginEmail(code),
    })
  }
  return { expiresAt, email: user.email }
}

export async function completeLoginWithPasswordAndOtp(
  emailRaw: string,
  password: string,
  codeRaw: unknown,
) {
  const user = await assertCredentials(emailRaw, password)
  return checkLoginOtpForUser(user, codeRaw)
}

export async function resendLoginOtpWithPassword(emailRaw: string, password: string) {
  requireMail()
  const user = await assertCredentials(emailRaw, password)
  const email = norm(user.email)
  if (env.staticOtpEnabled) {
    return saveChallenge(email, 'LOGIN', env.staticOtp)
  }
  const code = newSixDigitOtp()
  const expiresAt = await saveChallenge(email, 'LOGIN', code)
  sendMailAsync({
    to: user.email,
    subject: 'Tailor Studio — sign-in code',
    text: mail.loginPlain(code),
    html: mail.loginEmail(code),
  })
  return expiresAt
}

export async function resendLoginOtp(pendingTokenPlain: string) {
  requireMail()
  const pl = await PendingLogin.findOne({
    tokenHash: sha256Hex(pendingTokenPlain.trim()),
    expiresAt: { $gt: new Date() },
  }).lean()
  if (!pl) throw new Error('invalid_pending')
  const plRow = leanOne<{ userId: unknown; email: string }>(pl)
  const raw = await User.findById(parseObjectId(String(plRow.userId))).lean()
  if (!raw || norm(leanOne<{ email: string }>(raw).email) !== norm(plRow.email)) {
    throw new Error('invalid_pending')
  }
  const user = userFromLean(leanOne<Record<string, unknown>>(raw))
  const email = norm(plRow.email)
  if (env.staticOtpEnabled) {
    return saveChallenge(email, 'LOGIN', env.staticOtp)
  }
  const code = newSixDigitOtp()
  const expiresAt = await saveChallenge(email, 'LOGIN', code)
  sendMailAsync({
    to: user.email,
    subject: 'Tailor Studio — sign-in code',
    text: mail.loginPlain(code),
    html: mail.loginEmail(code),
  })
  return expiresAt
}

export async function verifyLoginOtp(_emailRaw: string, codeRaw: unknown, pendingTokenPlain: unknown) {
  const token = String(pendingTokenPlain ?? '').trim()
  if (!token) throw new Error('invalid_pending')

  const pl = await PendingLogin.findOne({
    tokenHash: sha256Hex(token),
    expiresAt: { $gt: new Date() },
  }).lean()
  if (!pl) throw new Error('invalid_pending')

  const plRow = leanOne<{ email: string; userId: unknown; _id: unknown }>(pl)
  const raw = await User.findById(parseObjectId(String(plRow.userId))).lean()
  if (!raw) throw new Error('invalid_pending')
  const user = userFromLean(leanOne<Record<string, unknown>>(raw))
  await PendingLogin.deleteOne({ _id: plRow._id })
  return checkLoginOtpForUser(user, codeRaw)
}

export async function sendForgotPasswordOtp(emailRaw: string) {
  requireMail()
  const user = await findByEmailFlexible(emailRaw)
  if (!user) throw new Error('no_account')
  const email = norm(user.email)
  if (env.staticOtpEnabled) {
    return saveChallenge(email, 'PASSWORD_RESET', env.staticOtp)
  }
  const code = newSixDigitOtp()
  const expiresAt = await saveChallenge(email, 'PASSWORD_RESET', code)
  sendMailAsync({
    to: user.email,
    subject: 'Tailor Studio — reset password',
    text: mail.passwordResetPlain(code),
    html: mail.passwordResetEmail(code),
  })
  return expiresAt
}

export async function verifyForgotOtp(emailRaw: string, code: string) {
  const email = norm(emailRaw)
  const user = await findByEmailFlexible(emailRaw)
  if (!user) throw new Error('invalid_otp')

  const issue = async () => {
    await PasswordResetToken.deleteMany({ userId: parseObjectId(user.id) })
    const token = randomTokenHex(24)
    await PasswordResetToken.create({
      userId: parseObjectId(user.id),
      tokenHash: sha256Hex(token),
      expiresAt: new Date(Date.now() + RESET_MS),
    })
    return token
  }

  if (isStaticOtp(code)) {
    await OtpChallenge.deleteMany({ email, purpose: 'PASSWORD_RESET' })
    return issue()
  }

  const c = await OtpChallenge.findOne({
    email,
    purpose: 'PASSWORD_RESET',
    expiresAt: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean()
  if (!c || !constantTimeEquals(leanOne<{ codeHash: string }>(c).codeHash, hashOtp(email, code.trim()))) {
    throw new Error('invalid_otp')
  }
  await OtpChallenge.deleteOne({ _id: leanOne<{ _id: unknown }>(c)._id })
  return issue()
}

export async function resetPasswordWithToken(tokenRaw: string, newPassword: string) {
  if (!newPassword || newPassword.length < 8) throw new Error('Password must be at least 8 characters')
  const pr = await PasswordResetToken.findOne({
    tokenHash: sha256Hex(tokenRaw.trim()),
    expiresAt: { $gt: new Date() },
  }).lean()
  if (!pr) throw new Error('invalid_reset_token')
  await updatePasswordForUser(String(leanOne<{ userId: unknown }>(pr).userId), newPassword)
  await PasswordResetToken.deleteOne({ _id: leanOne<{ _id: unknown }>(pr)._id })
}
