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

export const FORM_NOTIFICATION_SUBJECT = 'New submission from Concierge Request Form'

export function customerDisplayName(data: ConciergeRequestDoc): string {
  return [data.firstName, data.lastName].filter(Boolean).join(' ').trim()
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
  return parts.join('\n')
}

function formatDateUS(iso: string | undefined): string {
  const v = (iso ?? '').trim()
  const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!m) return v
  return `${m[2]}/${m[3]}/${m[1]}`
}

function formatPhoneUS(digits: string | undefined): string {
  const d = (digits ?? '').replace(/\D/g, '')
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`
  }
  return digits?.trim() ?? ''
}

type EmailRow = { label: string; value: string; isEmail?: boolean }

function buildRows(data: ConciergeRequestDoc): EmailRow[] {
  const name = customerDisplayName(data) || '—'
  const address = addressBlock(data)
  const customerEmail = (data.email ?? '').trim()
  const phone = formatPhoneUS(data.phone)

  const rows: EmailRow[] = [
    { label: 'Name', value: name },
    { label: 'Address', value: address || '—' },
    { label: 'Phone', value: phone || '—' },
    { label: 'Email', value: customerEmail || '—', isEmail: Boolean(customerEmail) },
    {
      label: 'Date request needs to be completed',
      value: formatDateUS(data.dateNeeded) || '—',
    },
    { label: 'Time request needs to be completed', value: (data.timeNeeded ?? '').trim() || '—' },
    { label: 'Request', value: (data.requestType ?? '').trim() || '—' },
  ]

  const details = (data.details ?? '').trim()
  if (details) {
    rows.push({ label: 'Request Details or Comments', value: details })
  }

  rows.push({
    label: 'How did you hear about us?',
    value: (data.hearAboutUs ?? '').trim() || '—',
  })

  const payment = (data.paymentMethod ?? '').trim()
  if (payment && payment !== 'Skip — payment optional') {
    rows.push({ label: 'Payment method', value: payment })
    const cardholder = (data.cardholderName ?? '').trim()
    if (cardholder) rows.push({ label: 'Cardholder name', value: cardholder })
    if (data.cardLastFour) rows.push({ label: 'Card last 4', value: data.cardLastFour })
    if (data.expMonth || data.expYear) {
      rows.push({
        label: 'Card expiration',
        value: [data.expMonth, data.expYear].filter(Boolean).join('/'),
      })
    }
  }

  return rows
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function renderValue(row: EmailRow): string {
  if (row.isEmail && row.value !== '—') {
    const e = escapeHtml(row.value)
    return `<a href="mailto:${e}" style="color:#1a73e8;text-decoration:underline">${e}</a>`
  }
  return escapeHtml(row.value).replace(/\n/g, '<br>')
}

export function buildRequestEmail(data: ConciergeRequestDoc, _requestId: string) {
  const rows = buildRows(data)
  const subject = FORM_NOTIFICATION_SUBJECT

  const text = rows.map((r) => `${r.label}\n${r.value}`).join('\n\n')

  const tableRows = rows
    .map((row, i) => {
      const bg = i % 2 === 0 ? '#eef6fc' : '#ffffff'
      return `<tr style="background:${bg}">
  <td style="padding:10px 12px;font-weight:bold;vertical-align:top;width:42%;color:#1a1a1a;border:1px solid #d8e8f4">${escapeHtml(row.label)}</td>
  <td style="padding:10px 12px;vertical-align:top;color:#1a1a1a;border:1px solid #d8e8f4">${renderValue(row)}</td>
</tr>`
    })
    .join('')

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a1a1a">
<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:640px;border-collapse:collapse">
${tableRows}
</table>
</body>
</html>`

  return { subject, text, html }
}
