/** Date and time helpers shared by the request form and the requests API. */

/** "15:05" (an <input type="time"> value) → "3:05 PM". Passes anything else through. */
export function fmtTime24(v: string): string {
  const m = /^(\d{1,2}):(\d{2})$/.exec(v.trim());
  if (!m) return v.trim();
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
}

/** "3:05 PM" → "15:05", for prefilling a time input from a stored request. "" if it doesn't parse. */
export function toTime24(v: string): string {
  const m = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(v.trim());
  if (!m) return "";
  const h = (Number(m[1]) % 12) + (m[3].toUpperCase() === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/** "2026-11-03" → "Tue, Nov 3". Read as a calendar date, never shifted by the time zone. */
export function fmtDate(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) return ymd;
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

/** Today as YYYY-MM-DD in the given time zone (default: the device's). */
export function todayYmd(timeZone?: string): string {
  return new Date().toLocaleDateString("en-CA", timeZone ? { timeZone } : undefined);
}
