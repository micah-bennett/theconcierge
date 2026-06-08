import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { initializeApp } from 'firebase-admin/app'
import { defineSecret, defineString } from 'firebase-functions/params'
import { logger } from 'firebase-functions/v2'
import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import {
  buildCustomerConfirmationEmail,
  buildRequestEmail,
  customerConfirmationLogoAttachment,
  notificationSenderDisplayName,
  sanitizeEmailDisplayName,
  type ConciergeRequestDoc,
} from './formatRequestEmail.js'
import { sendMailWithSmtpFallback } from './smtp.js'

initializeApp()

const smtpPass = defineSecret('SMTP_PASS')
const smtpUser = defineString('SMTP_USER', {
  default: 'hvconciergeservices@gmail.com',
  description: 'Google SMTP login (sending account)',
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
const smtpFrom = defineString('SMTP_FROM', {
  default: 'hvconciergeservices@gmail.com',
  description: 'From address on notification emails (display name includes customer)',
})
const conciergeBrand = defineString('CONCIERGE_BRAND', {
  default: 'The Concierge',
  description: 'Display name on customer confirmation emails',
})

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

const functionsDir = join(dirname(fileURLToPath(import.meta.url)), '..')
const customerEmailLogoPath = join(functionsDir, 'assets', 'email-logo-dark.png')

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

    const mailbox = smtpUser.value().trim()
    const host = smtpHost.value().trim()
    const port = Number(smtpPort.value())
    const customerEmail = (data.email ?? '').trim()
    const fromMailbox = smtpFrom.value().trim() || mailbox
    const senderLabel = sanitizeEmailDisplayName(notificationSenderDisplayName(data))
    const brandLabel = sanitizeEmailDisplayName(conciergeBrand.value().trim() || 'The Concierge')
    const smtpCredentials = {
      user: mailbox,
      pass: smtpPass.value().replace(/\s/g, ''),
      host,
      port,
    }

    try {
      const profileUsed = await sendMailWithSmtpFallback({
        ...smtpCredentials,
        mail: {
          from: `"${senderLabel}" <${fromMailbox}>`,
          to: notifyEmail.value(),
          replyTo: customerEmail || undefined,
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

      if (customerEmail && isValidEmail(customerEmail)) {
        try {
          const confirmation = buildCustomerConfirmationEmail(data)
          const confirmProfile = await sendMailWithSmtpFallback({
            ...smtpCredentials,
            mail: {
              from: `"${brandLabel}" <${fromMailbox}>`,
              to: customerEmail,
              subject: confirmation.subject,
              text: confirmation.text,
              html: confirmation.html,
              attachments: [customerConfirmationLogoAttachment(customerEmailLogoPath)],
            },
          })
          logger.info('Customer confirmation sent', {
            requestId,
            to: customerEmail,
            smtpProfile: confirmProfile,
          })
        } catch (confirmErr) {
          logger.error('Failed to send customer confirmation email', {
            requestId,
            to: customerEmail,
            error: confirmErr instanceof Error ? confirmErr.message : String(confirmErr),
          })
        }
      } else {
        logger.warn('Skipped customer confirmation — missing or invalid email', {
          requestId,
          customerEmail: customerEmail || '(empty)',
        })
      }
    } catch (err) {
      logger.error('Failed to send request notification email', {
        requestId,
        smtpHost: host,
        smtpPort: port,
        smtpUser: mailbox,
        error: err instanceof Error ? err.message : String(err),
      })
      throw err
    }
  },
)
