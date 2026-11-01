import { Resend } from 'resend'

import type { HopInquiry } from './inquiryValidation.js'
import type { InstantRequest } from './requestValidation.js'
import { inquiryOwnerNotificationTemplate } from './emailTemplates/inquiryOwnerNotification.js'
import { instantRequestOwnerNotificationTemplate } from './emailTemplates/instantRequestOwnerNotification.js'

const FROM = 'The Concierge <requests@theconcierge.life>'
const NOTIFY_EMAIL = 'micah@hvconcierge.com'

function client(): { resend: Resend; notifyTo: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')
  return {
    resend: new Resend(apiKey),
    notifyTo: process.env.NOTIFY_EMAIL?.trim() || NOTIFY_EMAIL,
  }
}

export async function sendInquiryEmail(data: HopInquiry): Promise<void> {
  const { resend, notifyTo } = client()
  const { error } = await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: data.email,
    subject: `New HOP Inquiry — ${data.interest}`,
    html: inquiryOwnerNotificationTemplate(data),
  })
  if (error) throw new Error(`Inquiry notification failed: ${error.message}`)
}

export async function sendInstantRequestEmail(data: InstantRequest, requestId: string): Promise<void> {
  const { resend, notifyTo } = client()
  const { error } = await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: data.email,
    subject: `New instant request — ${data.requestType}`,
    html: instantRequestOwnerNotificationTemplate(data, requestId),
  })
  if (error) throw new Error(`Instant request notification failed: ${error.message}`)
}
