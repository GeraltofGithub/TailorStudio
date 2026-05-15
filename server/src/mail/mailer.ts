import nodemailer from 'nodemailer'
import { env } from '../config/env.js'

let transport: nodemailer.Transporter | null = null

function tx() {
  if (!env.mail.user || !env.mail.pass) return null
  if (!transport) {
    transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: env.mail.user, pass: env.mail.pass },
    })
  }
  return transport
}

export const isMailConfigured = () => Boolean(env.mail.user && env.mail.pass)

export async function sendMail(p: { to: string; subject: string; text: string; html: string }) {
  const t = tx()
  if (!t) throw new Error('Email is not configured (set EMAIL and EMAIL_PASSWORD).')
  await t.sendMail({ from: env.mail.user, ...p })
}

export function sendMailAsync(p: { to: string; subject: string; text: string; html: string }) {
  setImmediate(() => sendMail(p).catch((e) => console.error('[mail]', e)))
}
