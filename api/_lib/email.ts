import { join } from 'node:path'
import nodemailer from 'nodemailer'

import {
  buildCustomerConfirmationEmail,
  buildRequestEmail,
  customerConfirmationLogoAttachment,
  notificationSenderDisplayName,
  sanitizeEmailDisplayName,
} from '../../functions/src/formatRequestEmail.js'
import type { ConciergeRequest } from './requestValidation.js'

function required(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value
}

export async function sendRequestEmails(data: ConciergeRequest, requestId: string): Promise<void> {
  const user = process.env.SMTP_USER?.trim() || 'hvconciergeservices@gmail.com'
  const from = process.env.SMTP_FROM?.trim() || user
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com'
  const port = Number(process.env.SMTP_PORT || '587')
  const notifyEmail = process.env.NOTIFY_EMAIL?.trim() || 'micah@hvconcierge.com'
  const brand = sanitizeEmailDisplayName(process.env.CONCIERGE_BRAND?.trim() || 'The Concierge')
  const password = required('SMTP_PASS').replace(/\s/g, '')
  const customerEmail = data.email.trim()

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: { user, pass: password },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  })

  const notification = buildRequestEmail(data, requestId)
  await transporter.sendMail({
    from: `"${sanitizeEmailDisplayName(notificationSenderDisplayName(data))}" <${from}>`,
    to: notifyEmail,
    replyTo: customerEmail,
    ...notification,
  })

  const confirmation = buildCustomerConfirmationEmail(data)
  await transporter.sendMail({
    from: `"${brand}" <${from}>`,
    to: customerEmail,
    ...confirmation,
    attachments: [
      customerConfirmationLogoAttachment(join(process.cwd(), 'public', 'email-logo-dark.png')),
    ],
  })
}
