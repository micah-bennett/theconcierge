/*
 * Constants used by both the client and the server: earn actions, tiers and the default
 * "HOP knows you" preferences. Ported from prototype/starter/components/staff/StaffApp.tsx and
 * the mockup (staff-app.html: EARN, TIERS, PREFS0 / defaultPrefs).
 */

export type EarnGroup = "daily" | "weekly" | "big";
export type Earn = [key: string, icon: string, label: string, points: number];

export const EARN: Record<EarnGroup, Earn[]> = {
  daily: [["check", "💬", "Daily mood check in", 20], ["reset", "🧘", "Finish a Five Minute Reset", 15], ["lunch", "🥗", "Take your full lunch break", 25], ["water", "💧", "Hit your water goal", 10], ["rate", "⭐", "Rate a finished request", 10], ["thanks", "🙏", "Thank a teammate", 10]],
  weekly: [["shout", "🙌", "Give a peer a public shout out", 30], ["steps", "👟", "10k steps on three days", 40], ["sleep", "😴", "Seven hours of sleep three nights", 60], ["class", "🏋️", "Join a wellness class", 50], ["ceu", "🎓", "Finish a CEU module", 100], ["mentor", "🤝", "Mentor a new hire for a shift", 75], ["cover", "📅", "Cover an open shift", 75], ["pulse", "📝", "Answer the weekly pulse", 50]],
  big: [["pto", "🌴", "Take a full day off, phone down", 100], ["refer", "💌", "Refer a colleague who joins", 150], ["story", "📣", "Share your HOP story", 40], ["family", "👨‍👩‍👧", "Add family dates to Moments", 20], ["connect", "⌚", "Connect your watch", 50], ["profile", "🧠", "Teach HOP 3 things about you", 30], ["praise", "💙", "Get named in a patient thank you", 80], ["streak", "🔥", "Keep a 7 day check in streak", 70]]
};

/** Daily earns reset every day, weekly every ISO week, big wins can be claimed once. [CONFIRM] */
export const EARN_PERIOD: Record<EarnGroup, "day" | "week" | "once"> = { daily: "day", weekly: "week", big: "once" };

export function findEarn(key: string): { group: EarnGroup; points: number; label: string } | null {
  for (const group of Object.keys(EARN) as EarnGroup[]) {
    const e = EARN[group].find((x) => x[0] === key);
    if (e) return { group, points: e[3], label: e[2] };
  }
  return null;
}

export const TIERS: [name: string, min: number, perk: string][] = [
  ["Bronze", 0, "Points on every request"],
  ["Silver", 2000, "Free ride home once a month"],
  ["Gold", 4000, "Priority concierge, answered first"],
  ["Platinum", 7000, "A monthly surprise from HOP"]
];

export type Pref = { i: string; k: string; v: string; src: string; conf: number; ok: boolean };

/** The starter's PREFS0: what a new member's "HOP knows you" starts with (sample, editable). */
export const PREFS0: Pref[] = [
  ["☕", "Coffee order", "Large oat milk latte, extra shot", "From 6 food requests", 92],
  ["🍜", "Go to dinner after nights", "Thai, mild, no peanuts", "From your orders", 88],
  ["💊", "Pharmacy", "Main Street pharmacy, pickup after 4 PM", "From errands", 95],
  ["🚸", "Approved pickup person", "David, or Ruth as backup", "You told HOP", 100],
  ["🌙", "Quiet hours", "8 AM to 3 PM after night shifts", "From your watch and schedule", 84],
  ["💬", "How to reach you", "Text first, call only if urgent", "From how you reply", 80]
].map(([i, k, v, src, conf]) => ({ i: i as string, k: k as string, v: v as string, src: src as string, conf: conf as number, ok: false }));

/** The key "Teach HOP something" entries are saved under. Three of them unlock the "profile" earn. */
export const TAUGHT_KEY = "You told HOP";

/** "What HOP learns from" switches (stored as consents `learn:<name>`) and their defaults. */
export const LEARN_SOURCES: [name: string, detail: string, defaultOn: boolean][] = [
  ["What you do in HOP", "Requests, ratings, and what you skip", true],
  ["Your calendars", "Upcoming events and open windows", true],
  ["Your watch", "Sleep, stress, and recovery", true],
  ["Your work schedule", "Shifts, doubles, and swaps", true],
  ["Saved with HOP", "Things you send to HOP with the Share button or the HOP browser button", false]
];

/** "Your privacy" switches (stored as consents `priv:<name>`), all on by default as in the mockup. */
export const PRIVACY = ["Work schedule", "Personal calendar", "Watch (sleep, steps, heart rate)", "Daily mood check in", "Share anonymized totals with my hospital"];

/** Consent keys: `wear:<app>`, `cal:<app>`, `work:<app>`, `learn:<source>`, `priv:<setting>`. */
export const CONSENT_KEY = /^(wear|cal|work|learn|priv):[A-Za-z0-9 (),.'-]{1,60}$/;
