import "server-only";
import { Resend } from "resend";

const FROM = "HOP <requests@theconcierge.life>";
const REPLY_TO = "micah@hvconcierge.com";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function layout(title: string, body: string, cta: { label: string; href: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#f7f4ee;font-family:'DM Sans',Arial,sans-serif;color:#14213a">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fff;border:1px solid #e4e8ef;border-radius:20px;padding:28px">
<tr><td style="font-family:Montserrat,Arial,sans-serif;font-weight:800;font-size:20px;color:#012f6c;padding-bottom:12px">${esc(title)}</td></tr>
<tr><td style="font-size:15px;line-height:1.55;color:#14213a">${body}</td></tr>
<tr><td style="padding:22px 0 8px"><a href="${esc(cta.href)}" style="display:inline-block;background:#04a6a8;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:14px">${esc(cta.label)}</a></td></tr>
<tr><td style="font-size:12px;color:#5d6b82;padding-top:10px">If the button doesn't work, paste this link into your browser:<br>${esc(cta.href)}</td></tr>
</table>
<p style="font-size:12px;color:#5d6b82;margin-top:16px">HOP · Radical Hospitality for the people who keep healthcare running.</p>
</td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, devLink: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    if (process.env.NODE_ENV !== "production") {
      console.log(`[email:dev] RESEND_API_KEY not set. Would send "${subject}" to ${to}. Link: ${devLink}`);
      return;
    }
    throw new Error("RESEND_API_KEY is not configured");
  }
  const { error } = await new Resend(apiKey).emails.send({ from: FROM, to, replyTo: REPLY_TO, subject, html });
  if (error) throw new Error(`Email failed: ${error.message}`);
}

export async function sendInviteEmail(to: string, firstName: string, appName: string, link: string): Promise<void> {
  const body = `Hi ${esc(firstName)},<br><br>You've been added to the HOP ${esc(appName)}. Set your password to sign in. This link works once and expires in 7 days.`;
  await send(to, `You're invited to the HOP ${appName}`, layout(`Welcome to HOP`, body, { label: "Set your password", href: link }), link);
}

export async function sendPasswordResetEmail(to: string, link: string): Promise<void> {
  const body = `Someone asked to reset the password for this HOP account. If that was you, choose a new password below. The link expires in 30 minutes. If it wasn't you, you can ignore this email.`;
  await send(to, "Reset your HOP password", layout("Reset your password", body, { label: "Choose a new password", href: link }), link);
}
