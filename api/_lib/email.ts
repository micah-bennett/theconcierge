import { Resend } from 'resend'

import type { ConciergeRequest } from './requestValidation.js'
import type { ReliefCallRequest } from './reliefValidation.js'
import { ownerNotificationTemplate } from './emailTemplates/ownerNotification.js'
import { customerConfirmationTemplate } from './emailTemplates/customerConfirmation.js'
import { reliefOwnerNotificationTemplate } from './emailTemplates/reliefOwnerNotification.js'
import { hopWelcomeTemplate } from './emailTemplates/hopWelcome.js'
import { hopPasswordResetTemplate } from './emailTemplates/hopPasswordReset.js'
import { hopAccountInviteTemplate } from './emailTemplates/hopAccountInvite.js'

const FROM = 'The Concierge <requests@theconcierge.life>'
const REPLY_TO = 'micah@hvconcierge.com'
const NOTIFY_EMAIL = 'micah@hvconcierge.com'

export async function sendRequestEmails(data: ConciergeRequest, requestId: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const notifyTo = process.env.NOTIFY_EMAIL?.trim() || NOTIFY_EMAIL
  const customerEmail = data.email.trim()

  console.log('CALLING RESEND NOW', {
    requestId,
    keyPrefix: apiKey.slice(0, 8) + '...',
    from: FROM,
    to: notifyTo,
  })
  console.log('[email] sending owner notification', { to: notifyTo, requestId })
  const { data: ownerData, error: ownerError } = await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: REPLY_TO,
    subject: 'New Concierge Request Received',
    html: ownerNotificationTemplate(data, requestId),
  })
  if (ownerError) {
    console.error('[email] owner notification failed', { error: ownerError, requestId })
    throw new Error(`Owner notification failed: ${ownerError.message}`)
  }
  console.log('[email] owner notification sent', { id: ownerData?.id, requestId })

  console.log('[email] sending customer confirmation', { to: customerEmail, requestId })
  const { data: customerData, error: customerError } = await resend.emails.send({
    from: FROM,
    to: customerEmail,
    replyTo: REPLY_TO,
    subject: 'Your Concierge Request Has Been Received',
    html: customerConfirmationTemplate(data),
  })
  if (customerError) {
    console.error('[email] customer confirmation failed', { error: customerError, requestId })
    throw new Error(`Customer confirmation failed: ${customerError.message}`)
  }
  console.log('[email] customer confirmation sent', { id: customerData?.id, requestId })
}

export async function sendReliefEmail(data: ReliefCallRequest): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const notifyTo = process.env.NOTIFY_EMAIL?.trim() || NOTIFY_EMAIL

  const { error } = await resend.emails.send({
    from: FROM,
    to: notifyTo,
    replyTo: data.email,
    subject: 'New Relief Call Request',
    html: reliefOwnerNotificationTemplate(data),
  })
  if (error) throw new Error(`Relief call notification failed: ${error.message}`)
}

export async function sendHopWelcomeEmail(
  email: string,
  firstName: string,
  hopNumber: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Welcome to HOP',
    html: hopWelcomeTemplate(firstName, hopNumber),
  })
  if (error) throw new Error(`HOP welcome email failed: ${error.message}`)
}

export async function sendHopPasswordResetEmail(email: string, resetUrl: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: 'Reset your HOP password',
    html: hopPasswordResetTemplate(resetUrl),
  })
  if (error) throw new Error(`HOP password reset email failed: ${error.message}`)
}

export async function sendHopAccountInviteEmail(
  email: string,
  role: 'user' | 'concierge' | 'facility',
  firstName: string,
  hopNumber: string,
  resetUrl: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

  const subjects: Record<typeof role, string> = {
    concierge: "You've been added as a HOP concierge",
    facility: "You've been added to HOP as a Facility Admin",
    user: "You've been added to HOP",
  }

  const resend = new Resend(apiKey)
  const { error } = await resend.emails.send({
    from: FROM,
    to: email,
    replyTo: REPLY_TO,
    subject: subjects[role],
    html: hopAccountInviteTemplate(role, firstName, hopNumber, resetUrl),
  })
  if (error) throw new Error(`HOP account invite email failed: ${error.message}`)
}
