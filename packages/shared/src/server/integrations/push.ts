import "server-only";

/** Push alerts to members and reps (new job offer, status change, needs attention). [CONFIRM provider] */
export async function notify(to: string, title: string, body: string) {
  if (!process.env.ONESIGNAL_APP_ID) return { ok: true, demo: true, to, title, body };
  // TODO(IT): send through OneSignal REST API using external_user_id = to.
  return { ok: true };
}
