import type { Job, JobCat, RepSummary, Role, StaffRequest, ThreadSummary, UserStatus } from "@hop/shared/types";

/**
 * A rep as the Console sees them. `active` reps can be dispatched to; inactive ones are kept so old
 * jobs still show a name. `availability` is the rep's own online toggle; `rating` is their average
 * star rating from portal_ratings (null with no ratings yet).
 */
export interface ConsoleRep extends RepSummary {
  active: boolean;
  rating: number | null;
  ratings: number;
}

/** One "HOP knows you" preference from portal_staff_profiles.prefs (shape set by the HOP Client). */
export interface MemberPref {
  i?: string;
  k?: string;
  v?: string;
}

/** A staff request plus what the Console needs about the member (from portal_users / portal_staff_profiles). */
export interface ConsoleRequest extends StaffRequest {
  memberPhone: string;
  memberPrefs: MemberPref[];
}

/** Live numbers for the KPI row and the volume chart (GET /api/requests → stats). */
export interface ConsoleStats {
  /** Requests created today (America/New_York) by category, plus console jobs made without a request. */
  volumeToday: { cat: JobCat | string; count: number }[];
  /** Minutes from a request's creation to its job being accepted, over the last 7 days. Null with no data. */
  response: { medianMin: number; avgMin: number; count: number } | null;
  /** Average stars over the last 30 days. Null with no ratings. */
  rating: { avg: number; count: number } | null;
}

/** GET /api/requests */
export interface RequestsResponse {
  requests: ConsoleRequest[];
  stats: ConsoleStats;
}

/** GET /api/jobs */
export interface JobsResponse {
  jobs: Job[];
  reps: ConsoleRep[];
}

/** An inbox row on the Console (GET /api/messages). `urgent`: an urgent message the team hasn't replied to yet. */
export interface ConsoleThread extends ThreadSummary {
  urgent: boolean;
}

/** A row on the Team screen (GET /api/team). Reps also carry availability and rating. */
export interface TeamRow {
  id: string;
  email: string;
  role: Exclude<Role, "staff" | "customer">;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  facilityId: string | null;
  facilityName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  availability?: "online" | "offline";
  rating?: number | null;
  ratings?: number;
}
