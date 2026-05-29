import { initializeApp } from 'firebase-admin/app'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import {
  buildRequestEmail,
  customerDisplayName,
  type ConciergeRequestDoc,
} from './formatRequestEmail.js'
import { sendMailWithSmtpFallback } from './smtp.js'

initializeApp()

const smtpPass = defineSecret('SMTP_PASS')
const smtpUser = defineString('SMTP_USER', {
  default: 'micah@hvconcierge.com',
  description: 'SMTP login (usually your mailbox address)',
})
const smtpHost = defineString('SMTP_HOST', {
  default: 'smtp.gmail.com',
  description: 'SMTP host (Google Workspace: smtp.gmail.com)',
})
const smtpPort = defineString('SMTP_PORT', {
  default: '587',
  description: 'SMTP port (Google Workspace: 587 STARTTLS)',
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

    const user = smtpUser.value().trim()
    const host = smtpHost.value().trim()
    const port = Number(smtpPort.value())
    const customerEmail = (data.email ?? '').trim()
    const customerName = customerDisplayName(data)
    const replyTo =
      customerEmail && customerName
        ? `"${customerName.replace(/"/g, '')}" <${customerEmail}>`
        : customerEmail || undefined
    const fromName = customerName
      ? `${customerName.replace(/"/g, '')} — Concierge request`
      : 'The Concierge'

    try {
      const profileUsed = await sendMailWithSmtpFallback({
        user,
        pass: smtpPass.value().replace(/\s/g, ''),
        host,
        port,
        mail: {
          from: `"${fromName}" <${user}>`,
          to: notifyEmail.value(),
          replyTo,
          subject,
          text,
          html,
        },
      })
      logger.info('Request notification sent', {
        requestId,
        to: notifyEmail.value(),
        smtpProfile: profileUsed,
      })
    } catch (err) {
      logger.error('Failed to send request notification email', {
        requestId,
        smtpHost: host,
        smtpPort: port,
        smtpUser: user,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  },
)
