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

/** Shown in the inbox From column (when From address ≠ To address). */
export function notificationSenderDisplayName(data: ConciergeRequestDoc): string {
  return customerDisplayName(data) || 'Guest'
}

export function buildRequestSubject(data: ConciergeRequestDoc): string {
  const name = customerDisplayName(data)
  if (name) return `Concierge Request from ${name}`
  return FORM_NOTIFICATION_SUBJECT
}

/** Strip characters that break RFC5322 quoted display names. */
export function sanitizeEmailDisplayName(name: string): string {
  return name.replace(/[\r\n"]/g, '').trim()
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
  const subject = buildRequestSubject(data)

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

const CONCIERGE_PHONE_DISPLAY = '845-518-4827'
const CONCIERGE_PHONE_TEL = '+18455184827'

const EMAIL_LOGO_CID = 'concierge-logo'
const EMAIL_LOGO_WIDTH = 168
const EMAIL_LOGO_HEIGHT = 76

function emailLogoMarkup(logoCid: string): string {
  return `<div style="margin:0 0 20px;text-align:center">
  <img src="cid:${logoCid}" alt="The Concierge" width="${EMAIL_LOGO_WIDTH}" height="${EMAIL_LOGO_HEIGHT}" style="display:inline-block;width:${EMAIL_LOGO_WIDTH}px;height:${EMAIL_LOGO_HEIGHT}px;max-width:100%;border:0;outline:none;text-decoration:none" />
</div>`
}

export function customerConfirmationLogoAttachment(logoPath: string) {
  return {
    filename: 'concierge-logo.png',
    path: logoPath,
    cid: EMAIL_LOGO_CID,
    contentType: 'image/png' as const,
  }
}

export function buildCustomerConfirmationEmail(
  data: ConciergeRequestDoc,
  options: { logoCid?: string } = {},
) {
  const logoCid = options.logoCid ?? EMAIL_LOGO_CID
  const firstName = (data.firstName ?? '').trim()
  const greetingName = firstName || 'there'
  const requestType = (data.requestType ?? '').trim()
  const dateNeeded = formatDateUS(data.dateNeeded)
  const timeNeeded = (data.timeNeeded ?? '').trim()

  const summaryParts: string[] = []
  if (requestType) summaryParts.push(`Request: ${requestType}`)
  if (dateNeeded) summaryParts.push(`Date needed: ${dateNeeded}`)
  if (timeNeeded) summaryParts.push(`Time: ${timeNeeded}`)
  const summaryBlock = summaryParts.length > 0 ? summaryParts.join('\n') : 'Your request details are on file.'

  const subject = 'We received your concierge request'

  const text = `Hi ${greetingName},

Thank you — we received your concierge request and our team will follow up shortly.

${summaryBlock}

If you need to reach us sooner, call ${CONCIERGE_PHONE_DISPLAY}.`

  const summaryHtml = summaryParts
    .map((line) => `<li style="margin:0;padding:0;line-height:1.35">${escapeHtml(line)}</li>`)
    .join('')

  const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:24px 16px;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.55;color:#141414;background:#f4f4f5">
  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #e4e4e7;border-radius:8px">
    <tr>
      <td style="padding:28px 24px 8px;text-align:center">
        ${emailLogoMarkup(logoCid)}
        <h1 style="margin:0 0 16px;font-size:22px;font-weight:600;line-height:1.3;color:#141414;text-align:center">We received your request</h1>
        <p style="margin:0 0 16px;text-align:left">Hi ${escapeHtml(greetingName)},</p>
        <p style="margin:0 0 16px;text-align:left">Thank you — your request has been sent to our team. Someone will follow up with you shortly.</p>
        ${
          summaryParts.length > 0
            ? `<ul style="margin:0 0 16px;padding:0 0 0 20px;list-style-position:outside">${summaryHtml}</ul>`
            : ''
        }
        <p style="margin:0 0 8px;text-align:left">Need to reach us sooner?</p>
        <p style="margin:0;text-align:left"><a href="tel:${CONCIERGE_PHONE_TEL}" style="color:#141414;font-weight:600;text-decoration:underline">${CONCIERGE_PHONE_DISPLAY}</a></p>
      </td>
    </tr>
    <tr>
      <td style="padding:16px 24px 28px;border-top:1px solid #ececee;color:#71717a;font-size:13px">
        This is an automated confirmation. Please do not reply to this message.
      </td>
    </tr>
  </table>
</body>
</html>`

  return { subject, text, html }
}
