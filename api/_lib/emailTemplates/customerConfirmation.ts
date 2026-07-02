import type { ConciergeRequest } from '../requestValidation.js'

const LOGO_URL = 'https://theconcierge.life/email-logo-light.png'
const SITE_URL = 'https://theconcierge.life'
const PHONE_DISPLAY = '(845) 518-4827'
const PHONE_TEL = '+18455184827'

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

export function customerConfirmationTemplate(data: ConciergeRequest): string {
  const firstName = data.firstName.trim()
  const greeting = firstName ? `Dear ${escapeHtml(firstName)},` : 'Dear Valued Client,'
  const requestType = data.requestType.trim()
  const dateNeeded = formatDateUS(data.dateNeeded)
  const timeNeeded = data.timeNeeded.trim()

  const summaryRows: string[] = []
  if (requestType) {
    summaryRows.push(`
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8ec;width:40%;vertical-align:top">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9ca3af">Request</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8ec;vertical-align:top">
          <span style="font-size:13px;color:#1a1a2e">${escapeHtml(requestType)}</span>
        </td>
      </tr>`)
  }
  if (dateNeeded) {
    summaryRows.push(`
      <tr>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8ec;background:#fafafa;vertical-align:top">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9ca3af">Date</span>
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e8e8ec;background:#fafafa;vertical-align:top">
          <span style="font-size:13px;color:#1a1a2e">${escapeHtml(dateNeeded)}</span>
        </td>
      </tr>`)
  }
  if (timeNeeded) {
    summaryRows.push(`
      <tr>
        <td style="padding:10px 14px;vertical-align:top">
          <span style="font-size:11px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;color:#9ca3af">Time</span>
        </td>
        <td style="padding:10px 14px;vertical-align:top">
          <span style="font-size:13px;color:#1a1a2e">${escapeHtml(timeNeeded)}</span>
        </td>
      </tr>`)
  }

  const summaryTable =
    summaryRows.length > 0
      ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"
           style="margin:0 0 28px;border:1px solid #e8e8ec;border-radius:8px;overflow:hidden">
           ${summaryRows.join('')}
         </table>`
      : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<title>Your Concierge Request Has Been Received</title>
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12)">

          <!-- Header -->
          <tr>
            <td style="background:#0d1b35;padding:36px 40px;text-align:center">
              <a href="${SITE_URL}" style="display:inline-block;border:0">
                <img src="${LOGO_URL}" alt="The Concierge" width="168" height="76" style="display:block;border:0;max-width:100%;height:auto">
              </a>
            </td>
          </tr>

          <!-- Navy accent band -->
          <tr>
            <td style="background:#1a3060;padding:12px 40px;text-align:center">
              <span style="color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase">Request Confirmed</span>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:#ffffff;padding:40px 40px 32px">
              <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;line-height:1.7">${greeting}</p>

              <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;line-height:1.7">
                Thank you for reaching out to The Concierge. We have successfully received your request
                and our team is reviewing it now.
              </p>

              ${summaryTable}

              <p style="margin:0 0 20px;font-size:15px;color:#1a1a2e;line-height:1.7">
                A concierge specialist will contact you shortly to confirm details and next steps.
                We appreciate the opportunity to assist you.
              </p>

              <p style="margin:0 0 4px;font-size:15px;color:#1a1a2e;line-height:1.7">Warm regards,</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#0d1b35">The Concierge Team</p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="background:#ffffff;padding:0 40px">
              <div style="border-top:1px solid #eaecf0"></div>
            </td>
          </tr>

          <!-- Contact strip -->
          <tr>
            <td style="background:#ffffff;padding:24px 40px;text-align:center">
              <p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#9ca3af">Reach Us Anytime</p>
              <p style="margin:0;font-size:14px;color:#1a1a2e">
                <a href="tel:${PHONE_TEL}" style="color:#0d1b35;text-decoration:underline;font-weight:600">${escapeHtml(PHONE_DISPLAY)}</a>
              </p>
            </td>
          </tr>

          <!-- Dark footer -->
          <tr>
            <td style="background:#0d1b35;padding:24px 40px;text-align:center">
              <p style="margin:0 0 8px;font-size:12px;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;font-weight:600">The Concierge</p>
              <p style="margin:0;font-size:12px;color:#8a9bb5;line-height:1.8">
                <a href="${SITE_URL}" style="color:#8a9bb5;text-decoration:none">${SITE_URL.replace('https://', '')}</a>
                &nbsp;&middot;&nbsp;
                <a href="tel:${PHONE_TEL}" style="color:#8a9bb5;text-decoration:none">${escapeHtml(PHONE_DISPLAY)}</a>
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
