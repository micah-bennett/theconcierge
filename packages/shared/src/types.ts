import type { JOB_CATS } from "./brand";

/** One role per app. `customer` = an individual on the Concierge Portal (no facility, never in Facility View). */
export type Role = "staff" | "rep" | "console" | "facility_admin" | "customer";
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
  availability: "online" | "offline";
}

export type JobCat = (typeof JOB_CATS)[number];
export type JobStatus = "offer" | "accepted" | "started" | "in_progress" | "completed" | "declined";
/** A rep's user id (uuid). */
export type RepId = string;
export type LogEntry = [time: string, text: string];

export interface Door {
  kind: string;
  state: "idle" | "asked" | "ok" | "denied" | "open" | "closed";
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
export type RequestSource =
  | "ask" | "clutch" | "rescue" | "voice" | "chat" | "welcome" | "life" | "facility" | "console" | "reward" | "safety"
  /** A Concierge Portal customer's request. */
  | "concierge"
  /** A no-account request from the public site (hopserves.com/request). */
  | "instant";

/**
 * Where a request came from, stored in the indexed `portal_requests.channel` column.
 * Only `organization` requests can ever count toward Facility View.
 */
export type RequestChannel = "organization" | "concierge" | "instant";

export interface ConciergeAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

export interface FlightInfo {
  airline: string;
  flightNumber: string;
  airport: string;
  /** "departure" (drop at the airport) or "arrival" (pick up from it). */
  direction: "departure" | "arrival" | "";
  /** Scheduled flight time, free text such as "6:40 AM". */
  time: string;
  passengers: string;
  bags: string;
}

/**
 * Payment preference on a concierge request. The full card number is never collected:
 * only the method, the cardholder name and the last four digits for reference.
 * The team completes payment by phone. TODO(IT): a hosted checkout (e.g. Stripe) when one is chosen.
 */
export interface PaymentPreference {
  method: "" | "card" | "phone" | "invoice" | "other";
  cardholderName: string;
  cardLast4: string;
}

/** The extra detail a concierge or instant request carries (fields from the original HOP concierge form). */
export interface ConciergeDetails {
  requestType: string;
  /** YYYY-MM-DD */
  dateNeeded: string;
  /** e.g. "3:05 PM", or "" for any time. */
  timeNeeded: string;
  address: ConciergeAddress;
  flight: FlightInfo | null;
  payment: PaymentPreference;
  hearAboutUs: string;
  /** Instant requests only (no account): how to reach the requester. */
  contact?: { firstName: string; lastName: string; email: string; phone: string };
}

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
  /** Concierge Portal and instant requests only. */
  details?: ConciergeDetails;
}

/** A staff member's request as the Staff App sees it, with its job's progress. */
export interface MyRequest extends StaffRequest {
  jobStatus: JobStatus | null;
  repFirst: string | null;
}

export type ThreadKind = "staff" | "rep" | "job";

/** One chat message. Threads: staff/<staff id> ↔ HOP Console, rep/<rep id> ↔ HQ, job/<job id> rep ↔ member. */
export interface Message {
  id: number;
  threadKind: ThreadKind;
  threadKey: string;
  senderId: string | null;
  senderRole: Role;
  senderName: string;
  body: string;
  urgent: boolean;
  at: string;
}

/** A thread as an inbox row. */
export interface ThreadSummary {
  threadKind: ThreadKind;
  threadKey: string;
  title: string;
  last: Message;
  unread: number;
}
