import { initializeApp } from 'firebase-admin/app'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import nodemailer from 'nodemailer'
import { buildRequestEmail, type ConciergeRequestDoc } from './formatRequestEmail.js'

initializeApp()

const smtpPass = defineSecret('SMTP_PASS')
const smtpUser = defineString('SMTP_USER', {
  default: 'micah@hvconcierge.com',
  description: 'SMTP login (usually your mailbox address)',
})
const smtpHost = defineString('SMTP_HOST', {
  default: 'smtpout.secureserver.net',
  description: 'SMTP host (GoDaddy: smtpout.secureserver.net)',
})
const smtpPort = defineString('SMTP_PORT', {
  default: '465',
  description: 'SMTP port (465 for SSL)',
})
const notifyEmail = defineString('NOTIFY_EMAIL', {
  default: 'micah@hvconcierge.com',
  description: 'Inbox that receives new request notifications',
})

export const emailOnConciergeRequest = onDocumentCreated(
  {
    document: 'conciergeRequests/{requestId}',
    secrets: [smtpPass],
    region: 'us-central1',
  },
  async (event) => {
    const snap = event.data
    if (!snap) return

    const data = snap.data() as ConciergeRequestDoc
    const requestId = snap.id
    const { subject, text, html } = buildRequestEmail(data, requestId)

    const transporter = nodemailer.createTransport({
      host: smtpHost.value(),
      port: Number(smtpPort.value()),
      secure: Number(smtpPort.value()) === 465,
      auth: {
        user: smtpUser.value(),
        pass: smtpPass.value(),
      },
    })

    const customerEmail = (data.email ?? '').trim()
    try {
      await transporter.sendMail({
        from: `"The Concierge" <${smtpUser.value()}>`,
        to: notifyEmail.value(),
        replyTo: customerEmail || undefined,
        subject,
        text,
        html,
      })
      logger.info('Request notification sent', { requestId, to: notifyEmail.value() })
    } catch (err) {
      logger.error('Failed to send request notification email', {
        requestId,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  },
)
