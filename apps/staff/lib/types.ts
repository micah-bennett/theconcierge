import type { JobStatus, LogEntry, MyRequest } from "@hop/shared/types";
import type { Pref } from "./content";

export type Consent = { granted: boolean; scopes?: string[]; at: string };

/** GET /api/profile. Everything here is real (portal_users + portal_staff_profiles). */
export type Profile = {
  /** My own user id (the key of my HOP Concierge thread). */
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  jobTitle: string;
  facilityName: string | null;
  unitName: string | null;
  memberSince: string;
  prefs: Pref[];
  consents: Record<string, Consent>;
  points: number;
  lifetimePoints: number;
  /** Earn keys already claimed in their current period (today, this week, or ever). */
  claimed: string[];
};

export type DoorState = "idle" | "asked" | "ok" | "denied" | "open" | "closed";

/** GET /api/requests: one of my requests with its job's live progress. */
export type MyReq = MyRequest & {
  jobStatus: JobStatus | null;
  /** The job's time window, e.g. "3:00 to 5:00 PM", once dispatched. */
  jobWindow: string | null;
  attn: boolean;
  /** Client-facing job updates from the rep, with "Sent: " / "Client notified: " stripped. */
  updates: LogEntry[];
  /** "asked" means the rep is at the door waiting for my answer. null when the job has no smart door. */
  doorState: DoorState | null;
  doorKind: string | null;
  /** Completion photos on the job. Load them with GET /api/requests?photos=<request id>. */
  photoCount: number;
  /** My 1 to 5 star rating, once given. */
  rating: number | null;
};

/** Mon = 0 … Sun = 6. Times are "HH:MM", 24 hour. A shift that ends before it starts ends the next morning. */
export type ShiftPattern = { days: number[]; start: string; end: string; night: boolean };

export type Checkin = { day: string; mood: number; stress: number; tookBreak: boolean; word: string };

export type LifeItem = { id: number; title: string; dueOn: string | null; done: boolean };

export type Redemption = {
  id: string;
  rewardKey: string;
  name: string;
  points: number;
  at: string;
  requestId: string | null;
  /** Live status of its Console request, in the brand words. */
  status: string;
};

export type LeaderRow = { rank: number; name: string; unit: string | null; points: number; me: boolean };

/** GET /api/me: everything on screen that isn't a request or the profile. All from the database. */
export type MeState = {
  /** Today in America/New_York, "YYYY-MM-DD". */
  day: string;
  checkin: Checkin | null;
  /** Consecutive ET days with a daily check-in, ending today (or yesterday if not yet today). */
  streak: number;
  /** My daily check-ins over the last 14 days, oldest first. */
  history: Checkin[];
  pulse: {
    mine: { supported: number; word: string } | null;
    /** Distinct people on my unit who answered this week. */
    respondents: number;
    /** null until 5 or more people answered. */
    results: { avgSupported: number; supportedPct: number; words: [string, number][] } | null;
  };
  shift: ShiftPattern | null;
  life: LifeItem[];
  redemptions: Redemption[];
  interest: string[];
  challenges: { checkinDays: number; playDays: number; pulseDone: boolean };
  referral: { code: string; joined: number; url: string };
  social: { networks: { key: string; label: string; url: string }[]; blog: string; claimed: string[] };
  leaderboard: { rows: LeaderRow[]; myPoints: number; myRank: number | null; hidden: boolean };
};

/** GET /api/play: today's games, without answers until played. */
export type PlayState = {
  day: string;
  pointsToday: number;
  quiz: { questions: { q: string; options: string[] }[]; played: Played | null; correct?: number[]; explain?: string[] };
  words: { scrambles: { letters: string; hint: string }[]; played: Played | null; correct?: string[] };
  match: { situations: string[]; services: string[]; played: Played | null; correct?: number[] };
  read: { title: string; body: string; q: string; options: string[]; played: Played | null; correct?: number };
};

export type Played = { score: number; max: number; points: number };
