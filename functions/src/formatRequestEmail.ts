export type ConciergeRequestDoc = {
  firstName?: string
  lastName?: string
  addressLine1?: string
  addressLine2?: string
  city?: string
  state?: string
  zip?: string
  country?: string
  phone?: string
  email?: string
  dateNeeded?: string
  timeNeeded?: string
  requestType?: string
  details?: string
  hearAboutUs?: string
  paymentMethod?: string
  cardholderName?: string
  cardLastFour?: string
  expMonth?: string
  expYear?: string
}

function line(label: string, value: string | undefined): string {
  const v = (value ?? '').trim()
  return v ? `${label}: ${v}` : ''
}

function addressBlock(data: ConciergeRequestDoc): string {
  const parts = [
    data.addressLine1,
    data.addressLine2,
    [data.city, data.state, data.zip].filter(Boolean).join(', '),
    data.country,
  ]
    .map((p) => (p ?? '').trim())
    .filter(Boolean)
  return parts.length ? parts.join('\n') : ''
}

export function customerDisplayName(data: ConciergeRequestDoc): string {
  return [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
}

export function buildRequestEmail(data: ConciergeRequestDoc, requestId: string) {
  const name = customerDisplayName(data) || 'Unknown'
  const customerEmail = (data.email ?? '').trim()
  const subject = customerEmail
    ? `New request from ${name} — ${customerEmail}`
    : `New concierge request — ${name}`

  const rows = [
    line('Customer', name),
    line('Reply to', customerEmail),
    line('Request ID', requestId),
    line('Email', data.email),
    line('Phone', data.phone),
    line('Service type', data.requestType),
    line('Date needed', data.dateNeeded),
    line('Time needed', data.timeNeeded),
    line('Details', data.details),
    line('How they heard about us', data.hearAboutUs),
    line('Payment method', data.paymentMethod),
    line('Cardholder name', data.cardholderName),
    data.cardLastFour ? line('Card last 4', data.cardLastFour) : '',
    data.expMonth || data.expYear
      ? line('Card exp', [data.expMonth, data.expYear].filter(Boolean).join('/'))
      : '',
  ].filter(Boolean)

  const address = addressBlock(data)
  if (address) {
    rows.push('', 'Address:', address)
  }

  const text = [
    `New concierge request from ${name}.`,
    customerEmail ? `Reply to the customer: ${customerEmail}` : '',
    '',
    ...rows,
  ]
    .filter(Boolean)
    .join('\n')

  const htmlBody = rows
    .map((r) => {
      const idx = r.indexOf(': ')
      if (idx === -1) return `<p>${escapeHtml(r)}</p>`
      const label = r.slice(0, idx)
      const value = r.slice(idx + 2)
      return `<p><strong>${escapeHtml(label)}</strong><br>${escapeHtml(value).replace(/\n/g, '<br>')}</p>`
    })
    .join('')

  const htmlAddress = address
    ? `<p><strong>Address</strong></p><pre style="font-family:inherit;white-space:pre-wrap;margin:0">${escapeHtml(address)}</pre>`
    : ''

  const html = `<!DOCTYPE html><html><body style="font-family:sans-serif;line-height:1.5">
<p><strong>New request from ${escapeHtml(name)}</strong></p>
${customerEmail ? `<p>Reply to customer: <a href="mailto:${escapeHtml(customerEmail)}">${escapeHtml(customerEmail)}</a></p>` : ''}
<p>Submitted on <strong>theconcierge.life</strong></p>
${htmlBody}
${htmlAddress}
</body></html>`

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
