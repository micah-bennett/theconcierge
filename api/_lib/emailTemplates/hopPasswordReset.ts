const LOGO_URL = 'https://theconcierge.life/logo-mark-white.png'
const SITE_URL = 'https://theconcierge.life'

const FONT_SANS = "'DM Sans', 'Helvetica Neue', Arial, sans-serif"
const FONT_SERIF = "'Playfair Display', 'Cormorant Garamond', Georgia, serif"

export function hopPasswordResetTemplate(resetUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Reset your HOP password</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700&display=swap');
  body { margin:0; padding:0; background:#eef0f5; }
</style>
</head>
<body style="margin:0;padding:0;background:#eef0f5;font-family:${FONT_SANS}">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef0f5;padding:40px 16px">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;border-radius:12px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.12)">

          <tr>
            <td style="background:#0d1b35;padding:40px 40px 32px;text-align:center">
              <a href="${SITE_URL}" style="display:inline-block;border:0;text-decoration:none">
                <img src="${LOGO_URL}" alt="" width="110" height="110" style="display:block;border:0;width:110px;height:auto;margin:0 auto 16px">
                <span style="display:block;font-family:${FONT_SERIF};font-size:22px;font-weight:700;letter-spacing:4px;color:#ffffff;text-transform:uppercase;line-height:1.2">HOP</span>
              </a>
            </td>
          </tr>

          <tr>
            <td style="background:#1a3060;padding:12px 40px;text-align:center">
              <span style="font-family:${FONT_SANS};color:#ffffff;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase">Password Reset Requested</span>
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;padding:32px 40px 40px">
              <p style="margin:0 0 6px;font-family:${FONT_SERIF};font-size:22px;font-weight:700;color:#0d1b35;line-height:1.3">
                Reset your password
              </p>
              <p style="margin:0 0 20px;font-family:${FONT_SANS};font-size:14px;color:#1a1a2e;line-height:1.6">
                We received a request to reset the password on your HOP account. This link expires in 30 minutes
                and can only be used once.
              </p>
              <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                <tr>
                  <td style="background:#6366f1;border-radius:8px">
                    <a href="${resetUrl}" style="display:inline-block;padding:12px 28px;font-family:${FONT_SANS};font-size:14px;font-weight:700;color:#ffffff;text-decoration:none">
                      Reset password →
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:24px 0 0;font-family:${FONT_SANS};font-size:12px;color:#6b7280;line-height:1.6">
                If you didn't request this, you can safely ignore this email — your password won't change.
              </p>
            </td>
          </tr>

          <tr>
            <td style="background:#f8f9fb;padding:20px 40px;border-top:1px solid #eaecf0;text-align:center">
              <p style="margin:0;font-family:${FONT_SANS};font-size:12px;color:#9ca3af;line-height:1.6">
                <a href="${SITE_URL}" style="color:#9ca3af;text-decoration:none">${SITE_URL.replace('https://', '')}</a>
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
