/**
 * Masked calling and texting. Reps and members never see each other's real numbers.
 * Recommended: Twilio Proxy (or Twilio Voice + Messaging with a number pool). [CONFIRM provider]
 */
export async function createMaskedSession(_jobId: string, _memberPhone: string, _repPhone: string) {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    return { ok: false, demo: true, message: "Twilio not configured. Calls fall back to tel: links in demo mode." };
  }
  // TODO(IT): create a Proxy session with both participants and return the proxy number to the rep app.
  return { ok: true, proxyNumber: "+10000000000" };
}
