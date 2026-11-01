/*
 * Constants used by both the client and the server: earn actions, tiers, rewards, privacy
 * switches and Coming soon features. Ported from prototype/starter/components/staff/StaffApp.tsx
 * and the mockup (staff-app.html: EARN, TIERS).
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

/** Earns the server grants itself when the thing happens. They can't be claimed from the earn list. */
export const SERVER_EARNS = ["check", "pulse", "rate", "streak", "refer"];

export const TIERS: [name: string, min: number, perk: string][] = [
  ["Bronze", 0, "Points on every request"],
  ["Silver", 2000, "Free ride home once a month"],
  ["Gold", 4000, "Priority concierge, answered first"],
  ["Platinum", 7000, "A monthly surprise from HOP"]
];

export type Pref = { i: string; k: string; v: string; src: string; conf: number; ok: boolean };

/**
 * What a new member's "HOP knows you" starts with: nothing. HOP only lists what the member teaches
 * it. (The prototype seeded sample preferences; LEGACY_SAMPLE_PREFS hides those on accounts made
 * before this change, unless the member confirmed one.)
 */
export const PREFS0: Pref[] = [];

export const LEGACY_SAMPLE_PREFS = [
  "Large oat milk latte, extra shot",
  "Thai, mild, no peanuts",
  "Main Street pharmacy, pickup after 4 PM",
  "David, or Ruth as backup",
  "8 AM to 3 PM after night shifts",
  "Text first, call only if urgent"
];

/** The key "Teach HOP something" entries are saved under. Three of them unlock the "profile" earn. */
export const TAUGHT_KEY = "You told HOP";

/** "What HOP learns from" switches (stored as consents `learn:<name>`) and their defaults. */
export const LEARN_SOURCES: [name: string, detail: string, defaultOn: boolean][] = [
  ["What you do in HOP", "Requests, ratings, and what you skip", true],
  ["Your calendars", "Upcoming events and open windows, once connected", true],
  ["Your watch", "Sleep, stress, and recovery, once connected", true],
  ["Your work schedule", "Shifts, doubles, and swaps, once connected", true]
];

/** "Your privacy" switches (stored as consents `priv:<name>`), all on by default (absent = on). */
export const PRIVACY: [name: string, whenOn: string, whenOff: string][] = [
  ["Work schedule", "HOP may use your work schedule once it is connected", "HOP won't use your work schedule"],
  ["Personal calendar", "HOP may use your calendars once they are connected", "HOP won't use your calendars"],
  ["Watch (sleep, steps, heart rate)", "HOP may use your watch once it is connected", "HOP won't use your watch"],
  ["Daily mood check in", "The daily check-in shows on Today", "The daily check-in is hidden"],
  [
    "Share anonymized totals with my hospital",
    "Your check-ins count toward unit totals, shown to your organization only when 5 or more people answered. Never your name or your answers.",
    "Off: your check-ins are left out of every total your organization sees."
  ]
];

/**
 * What each privacy switch is called on screen. The PRIVACY names above are also the stored consent
 * keys (`priv:<name>`), so a rename happens here, never there: changing a key would reset everyone's choice.
 */
export const PRIVACY_LABEL: Record<string, string> = {
  "Share anonymized totals with my hospital": "Share anonymized totals with my organization"
};

/** The Facility View leaves out check-ins from staff who turned this off. Absent means on. Stored key: never rename. */
export const SHARE_TOTALS_KEY = "priv:Share anonymized totals with my hospital";
/** Leaderboard opt out. Absent means you are shown. */
export const HIDE_LB_KEY = "priv:Hide me on the leaderboard";

/** Consent keys: `wear:<app>`, `cal:<app>`, `work:<app>`, `learn:<source>`, `priv:<setting>`. */
export const CONSENT_KEY = /^(wear|cal|work|learn|priv):[A-Za-z0-9 (),.'-]{1,60}$/;

/**
 * The reward price list (not data). Redeeming deducts the points and sends a request to the HOP
 * Console, which arranges it. [CONFIRM reward catalog, prices and fulfillment]
 */
export const REWARDS: { key: string; icon: string; cls: string; name: string; cost: number; cat: "errand" | "food" }[] = [
  { key: "car-detail", icon: "🚙", cls: "s", name: "Car detail", cost: 1000, cat: "errand" },
  { key: "meal-prep", icon: "🥗", cls: "t", name: "A week of meal prep", cost: 1500, cat: "food" },
  { key: "house-clean", icon: "🧹", cls: "g", name: "Whole house clean", cost: 2000, cat: "errand" }
];

export const findReward = (key: string) => REWARDS.find((r) => r.key === key) ?? null;

/** Features that aren't built yet. "Tell me when" writes portal_interest (user_id, feature_key). */
export const COMING_SOON = {
  "crew-community": "HOP Crew community",
  "family-hub": "Family Hub",
  "smart-home": "Smart home and voice",
  "watch-readiness": "Readiness from your watch",
  "calendar-sync": "Calendar and schedule sync",
  "saved-with-hop": "Saved with HOP"
} as const;

export type FeatureKey = keyof typeof COMING_SOON;

/** The weekly pulse's word chips. Only these are counted in unit results (free text never is). */
export const PULSE_WORDS = ["Cared for", "Relieved", "Energized", "Neutral", "Stretched thin"];

/** The daily check-in's five faces, 1 (rough) to 5 (great). */
export const MOOD_FACES: [face: string, label: string][] = [["😣", "Rough"], ["😕", "Low"], ["😐", "Okay"], ["🙂", "Good"], ["😄", "Great"]];

/** The HOP blog (the "Read the HOP blog" earn). */
export const BLOG_URL = "https://blog.hopserves.com";
export const SOCIAL_NETWORKS = ["instagram", "facebook", "linkedin", "tiktok"] as const;
export type SocialNetwork = (typeof SOCIAL_NETWORKS)[number];
export const SOCIAL_LABEL: Record<SocialNetwork, string> = { instagram: "Instagram", facebook: "Facebook", linkedin: "LinkedIn", tiktok: "TikTok" };
/** Social earns: follow once per account per network, read the blog daily, share weekly. [CONFIRM points] */
export const SOCIAL_POINTS = { follow: 25, blog: 5, share: 30 };

/** Learn & Play points. Granted server side only, after checking the answers. [CONFIRM points] */
export const GAME_POINTS = { quiz: 10, words: 5, match: 20, read: 10 };
