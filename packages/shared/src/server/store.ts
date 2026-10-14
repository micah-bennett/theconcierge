import "server-only";
import { randomBytes } from "node:crypto";
import type { Facility, Job, JobStatus, MyRequest, PortalUser, RepSummary, Role, StaffRequest, Unit, UserStatus } from "../types";
import { toUser } from "./auth";
import { sql } from "./db";

/*
 * Jobs and requests keep the starter's full Job / StaffRequest objects in JSONB `data`; the
 * rep_id / member_id / status columns mirror them for indexing and ownership checks.
 * Ownership is enforced here, in the WHERE clause, not by the caller remembering to filter.
 */

export const newId = (prefix: string) => prefix + randomBytes(4).toString("hex");

// ── Jobs ─────────────────────────────────────────────────────────────────────

export async function listJobs(opts: { repId?: string } = {}): Promise<Job[]> {
  const rows = (opts.repId
    ? await sql()`SELECT data FROM portal_jobs WHERE rep_id = ${opts.repId} AND status <> 'declined' ORDER BY updated_at DESC LIMIT 200`
    : await sql()`SELECT data FROM portal_jobs ORDER BY updated_at DESC LIMIT 300`) as { data: Job }[];
  return rows.map((r) => r.data);
}

/** Returns the job, or null if it doesn't exist or (with repId) isn't that rep's. */
export async function getJob(id: string, opts: { repId?: string } = {}): Promise<Job | null> {
  const rows = (opts.repId
    ? await sql()`SELECT data FROM portal_jobs WHERE id = ${id} AND rep_id = ${opts.repId}`
    : await sql()`SELECT data FROM portal_jobs WHERE id = ${id}`) as { data: Job }[];
  return rows[0]?.data ?? null;
}

export async function createJob(job: Job, actorId: string): Promise<Job> {
  await sql()`
    INSERT INTO portal_jobs (id, rep_id, request_id, status, data)
    VALUES (${job.id}, ${job.rep}, ${job.requestId ?? null}, ${job.status}, ${JSON.stringify(job)}::jsonb)
  `;
  await logJobEvent(job.id, actorId, "created", { rep: job.rep, status: job.status });
  if (job.requestId) await updateRequest(job.requestId, { status: "dispatched", jobId: job.id });
  return job;
}

/**
 * Merges `patch` into the job. With `repId`, only that rep's job can change (returns null otherwise).
 * Writes a job event per status change or reassignment, and completes the linked request.
 */
export async function updateJob(id: string, patch: Partial<Job>, actorId: string, opts: { repId?: string } = {}): Promise<Job | null> {
  const before = await getJob(id, opts);
  if (!before) return null;
  const next: Job = { ...before, ...patch, id: before.id, updatedAt: Date.now() };
  const rows = (opts.repId
    ? await sql()`UPDATE portal_jobs SET rep_id = ${next.rep}, status = ${next.status}, data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id} AND rep_id = ${opts.repId} RETURNING id`
    : await sql()`UPDATE portal_jobs SET rep_id = ${next.rep}, status = ${next.status}, data = ${JSON.stringify(next)}::jsonb, updated_at = NOW() WHERE id = ${id} RETURNING id`) as unknown[];
  if (!rows.length) return null;
  if (patch.status && patch.status !== before.status) await logJobEvent(id, actorId, "status", { from: before.status, to: patch.status });
  if (patch.rep && patch.rep !== before.rep) await logJobEvent(id, actorId, "reassigned", { from: before.rep, to: patch.rep });
  if (patch.attn && !before.attn) await logJobEvent(id, actorId, "attention", patch.attn);
  if (next.requestId && patch.status === "completed") await updateRequest(next.requestId, { status: "completed" });
  return next;
}

export async function logJobEvent(jobId: string, actorId: string | null, kind: string, detail: unknown): Promise<void> {
  await sql()`INSERT INTO portal_job_events (job_id, actor_id, kind, detail) VALUES (${jobId}, ${actorId}, ${kind}, ${JSON.stringify(detail ?? {})}::jsonb)`;
}

export async function logDoorEvent(jobId: string, actorId: string, action: "unlock" | "lock"): Promise<void> {
  await sql()`INSERT INTO portal_door_events (job_id, actor_id, action) VALUES (${jobId}, ${actorId}, ${action})`;
}

// ── Requests ─────────────────────────────────────────────────────────────────

export async function listRequests(opts: { memberId?: string; status?: StaffRequest["status"] } = {}): Promise<StaffRequest[]> {
  const rows = (opts.memberId
    ? await sql()`SELECT data FROM portal_requests WHERE member_id = ${opts.memberId} ORDER BY created_at DESC LIMIT 100`
    : opts.status
      ? await sql()`SELECT data FROM portal_requests WHERE status = ${opts.status} ORDER BY created_at DESC LIMIT 200`
      : await sql()`SELECT data FROM portal_requests ORDER BY created_at DESC LIMIT 200`) as { data: StaffRequest }[];
  return rows.map((r) => r.data);
}

/** A staff member's requests with their job's live status and rep first name. */
export async function listMyRequests(memberId: string): Promise<MyRequest[]> {
  const rows = (await sql()`
    SELECT r.data, j.status AS job_status, u.first_name AS rep_first
    FROM portal_requests r
    LEFT JOIN portal_jobs j ON j.id = r.job_id
    LEFT JOIN portal_users u ON u.id = j.rep_id
    WHERE r.member_id = ${memberId}
    ORDER BY r.created_at DESC LIMIT 100
  `) as { data: StaffRequest; job_status: JobStatus | null; rep_first: string | null }[];
  return rows.map((r) => ({ ...r.data, jobStatus: r.job_status, repFirst: r.rep_first }));
}

export async function getRequest(id: string): Promise<StaffRequest | null> {
  const rows = (await sql()`SELECT data FROM portal_requests WHERE id = ${id}`) as { data: StaffRequest }[];
  return rows[0]?.data ?? null;
}

export async function createRequest(r: StaffRequest): Promise<StaffRequest> {
  await sql()`
    INSERT INTO portal_requests (id, member_id, status, job_id, data)
    VALUES (${r.id}, ${r.memberId}, ${r.status}, ${r.jobId ?? null}, ${JSON.stringify(r)}::jsonb)
  `;
  return r;
}

export async function updateRequest(id: string, patch: Partial<StaffRequest>): Promise<StaffRequest | null> {
  const cur = await getRequest(id);
  if (!cur) return null;
  const next: StaffRequest = { ...cur, ...patch, id: cur.id, memberId: cur.memberId };
  await sql()`
    UPDATE portal_requests SET status = ${next.status}, job_id = ${next.jobId ?? null}, data = ${JSON.stringify(next)}::jsonb, updated_at = NOW()
    WHERE id = ${id}
  `;
  return next;
}

// ── Users ────────────────────────────────────────────────────────────────────

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();

/** Active reps, for the Console's dispatch and reassign pickers. Replaces the starter's REPS. */
export async function listReps(): Promise<RepSummary[]> {
  const rows = (await sql()`SELECT id, first_name, last_name FROM portal_users WHERE role = 'rep' AND status = 'active' ORDER BY first_name, last_name`) as {
    id: string;
    first_name: string;
    last_name: string;
  }[];
  return rows.map((r) => ({ id: r.id, name: `${r.first_name} ${r.last_name}`, first: r.first_name, initials: initials(r.first_name, r.last_name) }));
}

export async function isActiveRep(id: string): Promise<boolean> {
  const rows = (await sql()`SELECT 1 FROM portal_users WHERE id = ${id} AND role = 'rep' AND status = 'active'`) as unknown[];
  return rows.length > 0;
}

export type TeamMember = PortalUser & { createdAt: string; lastLoginAt: string | null; facilityName: string | null };

export async function listUsers(opts: { roles?: Role[] } = {}): Promise<TeamMember[]> {
  const roles = opts.roles ?? ["staff", "rep", "console", "facility_admin"];
  const rows = (await sql()`
    SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.status, u.facility_id,
           u.created_at, u.last_login_at, f.name AS facility_name
    FROM portal_users u LEFT JOIN portal_facilities f ON f.id = u.facility_id
    WHERE u.role = ANY(${roles})
    ORDER BY u.role, u.first_name, u.last_name
  `) as (Parameters<typeof toUser>[0] & { created_at: string; last_login_at: string | null; facility_name: string | null })[];
  return rows.map((r) => ({ ...toUser(r), createdAt: r.created_at, lastLoginAt: r.last_login_at, facilityName: r.facility_name }));
}

export async function getUser(id: string): Promise<PortalUser | null> {
  const rows = (await sql()`SELECT id, email, role, first_name, last_name, phone, status, facility_id FROM portal_users WHERE id = ${id}`) as Parameters<typeof toUser>[0][];
  return rows[0] ? toUser(rows[0]) : null;
}

/** Creates an invited user with no password. Returns null if the email is taken. */
export async function createInvitedUser(input: {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  role: Role;
  facilityId: string | null;
}): Promise<PortalUser | null> {
  const rows = (await sql()`
    INSERT INTO portal_users (email, role, first_name, last_name, phone, status, facility_id)
    VALUES (${input.email.toLowerCase()}, ${input.role}, ${input.firstName}, ${input.lastName}, ${input.phone}, 'invited', ${input.facilityId})
    ON CONFLICT DO NOTHING
    RETURNING id, email, role, first_name, last_name, phone, status, facility_id
  `) as Parameters<typeof toUser>[0][];
  return rows[0] ? toUser(rows[0]) : null;
}

/** Disabling also ends every session for that user. */
export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  await sql()`UPDATE portal_users SET status = ${status}, updated_at = NOW() WHERE id = ${id}`;
  if (status === "disabled") await sql()`DELETE FROM portal_sessions WHERE user_id = ${id}`;
}

// ── Facilities ───────────────────────────────────────────────────────────────

export async function listFacilities(): Promise<Facility[]> {
  return (await sql()`SELECT id, name, city FROM portal_facilities ORDER BY name`) as Facility[];
}

export async function getFacility(id: string): Promise<Facility | null> {
  const rows = (await sql()`SELECT id, name, city FROM portal_facilities WHERE id = ${id}`) as Facility[];
  return rows[0] ?? null;
}

export async function listUnits(facilityId: string): Promise<Unit[]> {
  const rows = (await sql()`SELECT id, facility_id, name FROM portal_units WHERE facility_id = ${facilityId} ORDER BY name`) as {
    id: string;
    facility_id: string;
    name: string;
  }[];
  return rows.map((u) => ({ id: u.id, facilityId: u.facility_id, name: u.name }));
}
