import type { HopInquiry } from '../inquiryValidation.js'

const SITE_URL = 'https://theconcierge.life'
const FONT_SANS = "Inter, 'Helvetica Neue', Arial, sans-serif"

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

type Row = { label: string; value: string; isEmail?: boolean }

function buildRows(data: HopInquiry): Row[] {
  return [
    { label: 'Name', value: `${data.firstName} ${data.lastName}` },
    { label: 'Email', value: data.email, isEmail: true },
    { label: 'Organization', value: data.organization || '—' },
    { label: 'Interested in', value: data.interest },
    { label: 'Message', value: data.message },
  ]
}

function renderCell(row: Row): string {
  const e = escapeHtml(row.value)
  if (row.isEmail) {
    return `<a href="mailto:${e}" style="color:#053069;text-decoration:underline;font-weight:500">${e}</a>`
  }
  return e.replace(/\n/g, '<br>')
}

function renderRows(rows: Row[]): string {
  return rows
    .map(
      (row, i) => `
      <tr>
        <td style="padding:12px 16px;background:${i % 2 === 0 ? '#F5FAFC' : '#ffffff'};border-bottom:1px solid #D8E6EC;width:32%;vertical-align:top">
          <span style="font-family:${FONT_SANS};font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#60768D">${escapeHtml(row.label)}</span>
        </td>
        <td style="padding:12px 16px;background:${i % 2 === 0 ? '#F5FAFC' : '#ffffff'};border-bottom:1px solid #D8E6EC;vertical-align:top">
          <span style="font-family:${FONT_SANS};font-size:14px;color:#17324D;line-height:1.5">${renderCell(row)}</span>
        </td>
      </tr>`,
    )
    .join('')
}

/** Owner notification for the public site's "Start a Conversation" form (api/requests.ts?type=inquiry). */
export function inquiryOwnerNotificationTemplate(data: HopInquiry): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>New HOP Inquiry</title>
</head>
<body style="margin:0;padding:0;background:#EAF6FA;font-family:${FONT_SANS}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#EAF6FA;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(5,48,105,0.12)">
          <tr>
            <td style="background:#053069;padding:28px 40px;text-align:center">
              <span style="display:block;font-family:${FONT_SANS};font-size:28px;font-weight:900;letter-spacing:-1px;color:#ffffff">HOP</span>
              <span style="display:block;margin-top:4px;font-family:${FONT_SANS};font-size:10px;font-weight:800;letter-spacing:1.5px;color:#AFC3D1">HOSPITALITY ON-SITE PROFESSIONALS</span>
            </td>
          </tr>
          <tr>
            <td style="background:#0EABA6;padding:12px 40px;text-align:center">
              <span style="font-family:${FONT_SANS};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase">New Inquiry · ${escapeHtml(data.interest)}</span>
            </td>
          </tr>
          <tr>
            <td style="background:#ffffff;padding:32px 40px 24px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-radius:8px;overflow:hidden;border:1px solid #D8E6EC">
                ${renderRows(buildRows(data))}
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#F5FAFC;padding:20px 40px;border-top:1px solid #D8E6EC;text-align:center">
              <a href="${SITE_URL}" style="font-family:${FONT_SANS};font-size:12px;color:#60768D;text-decoration:none">${SITE_URL.replace('https://', '')}</a>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
