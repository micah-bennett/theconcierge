import { Resend } from 'resend'

import type { ConciergeRequest } from './requestValidation.js'
import { ownerNotificationTemplate } from './emailTemplates/ownerNotification.js'
import { customerConfirmationTemplate } from './emailTemplates/customerConfirmation.js'

const FROM = 'The Concierge <requests@theconcierge.life>'
const REPLY_TO = 'micah@hvconcierge.com'
const NOTIFY_EMAIL = 'micah@hvconcierge.com'

export async function sendRequestEmails(data: ConciergeRequest, requestId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const notifyTo = process.env.NOTIFY_EMAIL?.trim() || NOTIFY_EMAIL
  const customerEmail = data.email.trim()

  await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: REPLY_TO,
    subject: 'New Concierge Request Received',
    html: ownerNotificationTemplate(data, requestId),
  })

  await resend.emails.send({
    from: FROM,
    to: customerEmail,
    replyTo: REPLY_TO,
    subject: 'Your Concierge Request Has Been Received',
    html: customerConfirmationTemplate(data),
  })
}
