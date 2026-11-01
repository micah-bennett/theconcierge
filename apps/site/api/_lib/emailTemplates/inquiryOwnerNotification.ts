import type { HopInquiry } from '../inquiryValidation.js'
import { ownerNotificationLayout, type Row } from './layout.js'

function buildRows(data: HopInquiry): Row[] {
  return [
    { label: 'Name', value: `${data.firstName} ${data.lastName}` },
    { label: 'Email', value: data.email, isEmail: true },
    { label: 'Organization', value: data.organization || '—' },
    { label: 'Interested in', value: data.interest },
    { label: 'Message', value: data.message },
  ]
}

/** Owner notification for the public site's "Start a Conversation" form (api/inquiry.ts). */
export function inquiryOwnerNotificationTemplate(data: HopInquiry): string {
  return ownerNotificationLayout('New HOP Inquiry', `New Inquiry · ${data.interest}`, buildRows(data))
}
