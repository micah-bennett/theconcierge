import { PAYMENT_METHODS } from '../../../src/site/conciergeRequest.js'
import type { InstantRequest } from '../requestValidation.js'
import { ownerNotificationLayout, type Row } from './layout.js'

const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS)

function paymentLine(data: InstantRequest): string {
  const p = data.payment
  if (!p.method) return 'Skipped (payment optional)'
  if (p.method !== 'card') return PAYMENT_LABEL[p.method] ?? p.method
  // Only the method, name and last four are ever collected. The team takes the full number by phone.
  return [
    'Credit card',
    p.cardholderName && `, ${p.cardholderName}`,
    p.cardLast4 && ` ending ${p.cardLast4}`,
    ' (call to complete payment)',
  ]
    .filter(Boolean)
    .join('')
}

function buildRows(data: InstantRequest, requestId: string): Row[] {
  const a = data.address
  const address = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(', '), a.zip]
    .filter(Boolean)
    .join(', ')
  const rows: Row[] = [
    { label: 'Name', value: `${data.firstName} ${data.lastName}` },
    { label: 'Phone', value: data.phone, isPhone: true },
    { label: 'Email', value: data.email, isEmail: true },
    { label: 'Request', value: data.requestType },
    { label: 'Needed by', value: [data.dateNeeded, data.timeNeeded].filter(Boolean).join(' at ') },
    { label: 'Details', value: data.details },
    { label: 'Address', value: address || '—' },
  ]
  if (data.flight) {
    const f = data.flight
    const direction = f.direction === 'departure' ? 'Departing' : f.direction === 'arrival' ? 'Arriving' : '—'
    rows.push(
      { label: 'Airline', value: f.airline || '—' },
      { label: 'Flight number', value: f.flightNumber || '—' },
      { label: 'Airport', value: f.airport || '—' },
      { label: 'Departing / arriving', value: direction },
      { label: 'Flight time', value: f.time || '—' },
      { label: 'Passengers', value: f.passengers || '—' },
      { label: 'Bags', value: f.bags || '—' },
    )
  }
  rows.push(
    { label: 'Payment', value: paymentLine(data) },
    { label: 'Heard about HOP', value: data.hearAboutUs || '—' },
    { label: 'Request ID', value: `${requestId} (in the Concierge Console queue)` },
  )
  return rows
}

/** Owner notification for the public site's no-account instant request (api/request.ts). */
export function instantRequestOwnerNotificationTemplate(data: InstantRequest, requestId: string): string {
  return ownerNotificationLayout(
    'New instant request',
    `New Instant Request · ${data.requestType}`,
    buildRows(data, requestId),
  )
}
