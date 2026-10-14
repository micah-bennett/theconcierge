import { Resend } from 'resend'

import type { HopInquiry } from './inquiryValidation.js'
import { inquiryOwnerNotificationTemplate } from './emailTemplates/inquiryOwnerNotification.js'

const FROM = 'The Concierge <requests@theconcierge.life>'
const NOTIFY_EMAIL = 'micah@hvconcierge.com'

export async function sendInquiryEmail(data: HopInquiry): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const notifyTo = process.env.NOTIFY_EMAIL?.trim() || NOTIFY_EMAIL

  const { error } = await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: data.email,
    subject: `New HOP Inquiry — ${data.interest}`,
    html: inquiryOwnerNotificationTemplate(data),
  })
  if (error) throw new Error(`Inquiry notification failed: ${error.message}`)
}
