import { env } from '../config/env.js'

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')

function digits(code: string) {
  let row = ''
  const d = code.replace(/\D/g, '').slice(0, 6)
  for (let i = 0; i < 6; i++) {
    row += `<td style="width:44px;height:48px;text-align:center;font-size:22px;font-weight:600;border:1px solid #c9ced6;border-radius:8px;">${i < d.length ? d[i] : '&nbsp;'}</td>`
  }
  return `<table cellpadding="0" cellspacing="8" style="margin:20px auto;"><tr>${row}</tr></table>`
}

const wrap = (body: string) =>
  `<!DOCTYPE html><html><body style="margin:0;background:#eef2f4;font-family:system-ui,sans-serif;">${body}</body></html>`

const card = (title: string, code: string) =>
  wrap(
    `<table width="100%" style="padding:32px 16px;"><tr><td align="center"><table style="max-width:520px;background:#f9fbfc;border-radius:16px;width:100%;padding:28px;"><tr><td style="height:6px;background:linear-gradient(135deg,#b48c3a,#967028);"></td></tr><tr><td><p style="color:#2f7f7b;font-size:13px;text-transform:uppercase;">Tailor Studio</p><h1 style="color:#1a2f35;">${title}</h1><p style="color:#5b7178;">Expires in <strong>2 minutes</strong>.</p>${digits(code)}</td></tr></table></td></tr></table>`,
  )

export const loginPlain = (code: string) =>
  `Tailor Studio — sign-in code\n\nYour code: ${code}\n\nExpires in 2 minutes.`
export const loginEmail = (code: string) => card('Your sign-in code', code)
export const passwordResetPlain = (code: string) =>
  `Tailor Studio — password reset\n\nYour code: ${code}\n\nExpires in 2 minutes.`
export const passwordResetEmail = (code: string) => card('Reset your password', code)
