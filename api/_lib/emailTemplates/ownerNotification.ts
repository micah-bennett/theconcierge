import type { ConciergeRequest } from '../requestValidation.js'

const LOGO_URL = 'https://theconcierge.life/logo-mark-white.png'
const SITE_URL = 'https://theconcierge.life'
const PHONE_DISPLAY = '(845) 518-4827'

const FONT_SANS = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
const FONT_SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif"

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatDateUS(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  return m ? `${m[2]}/${m[3]}/${m[1]}` : iso
}

function formatPhoneUS(digits: string): string {
  const d = digits.replace(/\D/g, '')
  return d.length === 10 ? `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}` : digits
}

function toJobId(uuid: string): string {
  const digits = uuid.replace(/[^0-9]/g, '')
  return 'REQ-' + digits.slice(-6).padStart(6, '0')
}

type Row = { label: string; value: string; isEmail?: boolean; isPhone?: boolean }

function buildRows(data: ConciergeRequest, requestId: string): Row[] {
  const address = [
    data.addressLine1,
    data.addressLine2,
    [data.city, data.state, data.zip].filter(Boolean).join(', '),
    data.country,
  ]
    .map((p) => p.trim())
    .filter(Boolean)
    .join('\n')

  const rows: Row[] = [
    { label: 'Request ID', value: toJobId(requestId) },
    { label: 'Name', value: `${data.firstName} ${data.lastName}`.trim() },
    { label: 'Phone', value: formatPhoneUS(data.phone), isPhone: true },
    { label: 'Email', value: data.email, isEmail: true },
    { label: 'Address', value: address || '—' },
    { label: 'Date Needed', value: formatDateUS(data.dateNeeded) || '—' },
    { label: 'Time Needed', value: data.timeNeeded || '—' },
    { label: 'Request Type', value: data.requestType || '—' },
  ]

  if (data.details) {
    rows.push({ label: 'Special Instructions', value: data.details })
  }

  if (data.paymentMethod && data.paymentMethod !== 'Skip — payment optional') {
    rows.push({ label: 'Payment Method', value: data.paymentMethod })
    if (data.cardholderName) rows.push({ label: 'Cardholder Name', value: data.cardholderName })
    if (data.cardLastFour) rows.push({ label: 'Card Last 4', value: data.cardLastFour })
    if (data.expMonth || data.expYear) {
      rows.push({ label: 'Card Expiration', value: [data.expMonth, data.expYear].filter(Boolean).join('/') })
    }
  }

  return rows
}

function renderCell(row: Row): string {
  if (row.isEmail && row.value !== '—') {
    const e = escapeHtml(row.value)
    return `<a href="mailto:${e}" style="color:#0d1b35;text-decoration:underline;font-weight:500">${e}</a>`
  }
  if (row.isPhone && row.value !== '—') {
    const e = escapeHtml(row.value)
    const tel = row.value.replace(/\D/g, '')
    return `<a href="tel:+1${tel}" style="color:#0d1b35;text-decoration:underline;font-weight:500">${e}</a>`
  }
  return escapeHtml(row.value).replace(/\n/g, '<br>')
}

function renderRows(rows: Row[]): string {
  return rows
    .map(
      (row, i) => `
      <tr>
        <td style="padding:12px 16px;background:${i % 2 === 0 ? '#f8f9fb' : '#ffffff'};border-bottom:1px solid #eaecf0;width:38%;vertical-align:top">
          <span style="font-family:${FONT_SANS};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#6b7280">${escapeHtml(row.label)}</span>
        </td>
        <td style="padding:12px 16px;background:${i % 2 === 0 ? '#f8f9fb' : '#ffffff'};border-bottom:1px solid #eaecf0;vertical-align:top">
          <span style="font-family:${FONT_SANS};font-size:14px;color:#1a1a2e;line-height:1.5">${renderCell(row)}</span>
        </td>
      </tr>`,
    )
    .join('')
}

export function ownerNotificationTemplate(data: ConciergeRequest, requestId: string): string {
  const rows = buildRows(data, requestId)
  const name = `${data.firstName} ${data.lastName}`.trim()

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>New Concierge Request</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
  body { margin:0; padding:0; background:#eef0f5; }
</style>
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:${FONT_SANS}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12)">

          <!-- Header: logo + business name -->
          <tr>
            <td style="background:#0d1b35;padding:40px 40px 32px;text-align:center">
              <a href="${SITE_URL}" style="display:inline-block;border:0;text-decoration:none">
                <img src="${LOGO_URL}" alt="" width="110" height="110" style="display:block;border:0;width:110px;height:auto;margin:0 auto 16px">
                <span style="display:block;font-family:${FONT_SERIF};font-size:22px;font-weight:700;letter-spacing:4px;color:#ffffff;text-transform:uppercase;line-height:1.2">The Concierge</span>
              </a>
            </td>
          </tr>

          <!-- Navy accent band -->
          <tr>
            <td style="background:#1a3060;padding:12px 40px;text-align:center">
              <span style="font-family:${FONT_SANS};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase">New Request Received</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:32px 40px 24px">
              <p style="margin:0 0 6px;font-family:${FONT_SERIF};font-size:22px;font-weight:700;color:#0d1b35;line-height:1.3">
                ${escapeHtml(name)}
              </p>
              <p style="margin:0 0 24px;font-family:${FONT_SANS};font-size:13px;color:#6b7280">
                Submitted a new concierge request. All details are below.
              </p>

              <!-- Data table -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;border:1px solid #eaecf0">
                ${renderRows(rows)}
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8f9fb;padding:20px 40px;border-top:1px solid #eaecf0;text-align:center">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;color:#9ca3af;line-height:1.6">
                <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:none">${SITE_URL.replace('https://', '')}</a>
                &nbsp;·&nbsp;${escapeHtml(PHONE_DISPLAY)}
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
