import type { Job, RepSummary, Role, StaffRequest, UserStatus } from "@hop/shared/types";

/** A rep as the Console sees them. `active` reps can be dispatched to; inactive ones are kept so old jobs still show a name. */
export interface ConsoleRep extends RepSummary {
  active: boolean;
}

/** One "HOP knows you" preference from portal_staff_profiles.prefs (shape set by the Staff App). */
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

/** GET /api/jobs */
export interface JobsResponse {
  jobs: Job[];
  reps: ConsoleRep[];
}

/** A row on the Team screen (GET /api/team). */
export interface TeamRow {
  id: string;
  email: string;
  role: Exclude<Role, "staff">;
  firstName: string;
  lastName: string;
  phone: string;
  status: UserStatus;
  facilityId: string | null;
  facilityName: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}
