import type { JOB_CATS } from "./brand";

export type Role = "staff" | "rep" | "console" | "facility_admin";
export type UserStatus = "invited" | "active" | "disabled";

export interface PortalUser {
  id: string;
  email: string;
  role: Role;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  facilityId: string | null;
}

export interface Facility {
  id: string;
  name: string;
  city: string;
}

export interface Unit {
  id: string;
  facilityId: string;
  name: string;
}

/** A rep as other apps see them (replaces the starter's hard-coded REPS list). */
export interface RepSummary {
  id: string;
  name: string;
  first: string;
  initials: string;
}

export type JobCat = (typeof JOB_CATS)[number];
export type JobStatus = "offer" | "accepted" | "started" | "in_progress" | "completed" | "declined";
/** A rep's user id (uuid). */
export type RepId = string;
export type LogEntry = [time: string, text: string];

export interface Door {
  kind: string;
  state: "idle" | "asked" | "ok" | "open" | "closed";
  log?: LogEntry[];
}

export interface Vendor {
  name: string;
  contact: string;
  phone: string;
  phoneTxt: string;
}

export interface Job {
  id: string;
  rep: RepId;
  requestId?: string | null;
  cat: JobCat;
  icon: string;
  title: string;
  client: string;
  crole: string;
  phone: string;
  phoneTxt: string;
  pickup: string;
  drop: string;
  window: string;
  dist?: string;
  vendor: Vendor | null;
  items: string[];
  notes: string;
  prefs: string[];
  door: Door | null;
  needPhoto: boolean;
  needSig: boolean;
  status: JobStatus;
  sentAt: string;
  log: LogEntry[];
  updates: LogEntry[];
  photos: string[];
  sig: string | null;
  signedBy: string | null;
  notesList: string[];
  done: Record<string, boolean>;
  attn: { r: string; n?: string } | null;
  share: boolean;
  updatedAt: number;
}

export type RequestStatus = "new" | "dispatched" | "completed" | "cancelled";
export type RequestSource = "ask" | "clutch" | "rescue" | "voice" | "chat" | "welcome" | "life" | "facility" | "console";

export interface StaffRequest {
  id: string;
  /** The requesting user's id. */
  memberId: string;
  /** Display name, e.g. "Dr. Patel". Filled server side from the session. */
  member: string;
  /** Job title, e.g. "ER Doctor". Filled server side from the profile. */
  role: string;
  cat: JobCat;
  text: string;
  urgent?: boolean;
  window?: string;
  source?: RequestSource;
  createdAt: number;
  status: RequestStatus;
  jobId?: string;
}

/** A staff member's request as the Staff App sees it, with its job's progress. */
export interface MyRequest extends StaffRequest {
  jobStatus: JobStatus | null;
  repFirst: string | null;
}
