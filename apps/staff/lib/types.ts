import type { JobStatus, LogEntry, MyRequest } from "@hop/shared/types";
import type { Pref } from "./content";

export type Consent = { granted: boolean; scopes?: string[]; at: string };

/** GET /api/profile. Everything here is real (portal_users + portal_staff_profiles). */
export type Profile = {
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

/** GET /api/requests: one of my requests with its job's live progress. */
export type MyReq = MyRequest & {
  jobStatus: JobStatus | null;
  /** The job's time window, e.g. "3:00 to 5:00 PM", once dispatched. */
  jobWindow: string | null;
  attn: boolean;
  /** Client-facing job updates from the rep ("Client notified: Started"). */
  updates: LogEntry[];
};
