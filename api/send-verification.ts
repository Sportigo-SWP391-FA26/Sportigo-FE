import { timingSafeEqual } from 'node:crypto'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import nodemailer from 'nodemailer'

type MailPayload = {
  secret?: string
  to?: string
  subject?: string
  text?: string
  html?: string
}

export default async function handler(request: VercelRequest, response: VercelResponse) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST')
    return response.status(405).json({ ok: false, error: 'Method not allowed' })
  }

  const expectedSecret = process.env.GMAIL_WEBHOOK_SECRET
  const smtpUser = process.env.GMAIL_SMTP_USER
  const smtpPassword = process.env.GMAIL_SMTP_APP_PASSWORD
  if (!expectedSecret || !smtpUser || !smtpPassword) {
    return response.status(503).json({ ok: false, error: 'Email service is not configured' })
  }

  const payload = (request.body ?? {}) as MailPayload
  if (!isSameSecret(payload.secret, expectedSecret)) {
    return response.status(401).json({ ok: false, error: 'Unauthorized' })
  }
  if (!payload.to || !payload.subject || !payload.text || !payload.html) {
    return response.status(400).json({ ok: false, error: 'Missing required fields' })
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPassword.replaceAll(' ', '') },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  })

  try {
    await transporter.sendMail({
      from: `Sportigo <${smtpUser}>`,
      to: payload.to,
      subject: payload.subject,
      text: payload.text,
      html: payload.html,
    })
    return response.status(200).json({ ok: true })
  } catch (error) {
    console.error('Gmail SMTP delivery failed', error)
    return response.status(502).json({ ok: false, error: 'Email delivery failed' })
  }
}

function isSameSecret(provided: string | undefined, expected: string) {
  if (!provided) return false
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expected)
  return providedBuffer.length === expectedBuffer.length && timingSafeEqual(providedBuffer, expectedBuffer)
}
