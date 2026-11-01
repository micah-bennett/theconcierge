import "server-only";
import { randomBytes } from "node:crypto";
import type { Facility, Job, JobStatus, LogEntry, MyRequest, PortalUser, RepSummary, RequestChannel, Role, StaffRequest, Unit, UserStatus } from "../types";
import { toUser } from "./auth";
import { json, sql } from "./db";

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
    : await sql()`SELECT data FROM portal_jobs ORDER BY created_at DESC LIMIT 300`) as { data: Job }[];
  return rows.map((r) => r.data);
}

/** Returns the job, or null if it doesn't exist or (with repId) isn't that rep's. */
export async function getJob(id: string, opts: { repId?: string } = {}): Promise<Job | null> {
  const rows = (opts.repId
    ? await sql()`SELECT data FROM portal_jobs WHERE id = ${id} AND rep_id = ${opts.repId}`
    : await sql()`SELECT data FROM portal_jobs WHERE id = ${id}`) as { data: Job }[];
  return rows[0]?.data ?? null;
}

/**
 * Creates the job. With a requestId, the request is claimed first (new → dispatched) in one
 * conditional UPDATE, so two consoles dispatching the same request can't both create a job:
 * the loser gets a 409.
 */
export async function createJob(job: Job, actorId: string): Promise<Job> {
  if (job.requestId) {
    const claimed = (await sql()`
      UPDATE portal_requests
      SET status = 'dispatched', job_id = ${job.id},
          data = data || ${JSON.stringify({ status: "dispatched", jobId: job.id })}::jsonb, updated_at = NOW()
      WHERE id = ${job.requestId} AND status = 'new'
      RETURNING id
    `) as unknown[];
    if (!claimed.length) throw json({ error: "This request was already dispatched or cancelled." }, 409);
  }
  await sql()`
    INSERT INTO portal_jobs (id, rep_id, request_id, status, data)
    VALUES (${job.id}, ${job.rep}, ${job.requestId ?? null}, ${job.status}, ${JSON.stringify(job)}::jsonb)
  `;
  await logJobEvent(job.id, actorId, "created", { rep: job.rep, status: job.status });
  return job;
}

/**
 * Append-only list fields: the console and the rep both add entries within one 4 s poll, so a
 * PATCH's array is merged into what's stored (keeping every existing entry, adding new ones)
 * rather than replacing it. Entries can't be deleted through a PATCH.
 */
function mergeAppend<T>(stored: T[] | undefined, incoming: T[] | undefined): T[] | undefined {
  if (!incoming) return stored;
  const seen = new Set((stored ?? []).map((e) => JSON.stringify(e)));
  return [...(stored ?? []), ...incoming.filter((e) => !seen.has(JSON.stringify(e)))];
}

/**
 * Merges `patch` into the job. With `repId`, only that rep's job can change (returns null otherwise).
 * `log`, `updates`, `notesList` and `door.log` are append-merged (see mergeAppend).
 * The UPDATE is conditional on the status and data.updatedAt read here (a JS ms number, so it
 * compares exactly, unlike a timestamptz round-tripped through the driver), so two concurrent PATCHes
 * can't both pass the caller's status-move check: the second gets a 409 and should refetch.
 * Writes a job event per status change or reassignment, and completes the linked request.
 */
export async function updateJob(id: string, patch: Partial<Job>, actorId: string, opts: { repId?: string } = {}): Promise<Job | null> {
  const before = await getJob(id, opts);
  if (!before) return null;
  const next: Job = {
    ...before,
    ...patch,
    id: before.id,
    log: mergeAppend<LogEntry>(before.log, patch.log) ?? [],
    updates: mergeAppend<LogEntry>(before.updates, patch.updates) ?? [],
    notesList: mergeAppend<string>(before.notesList, patch.notesList) ?? [],
    door: patch.door === undefined ? before.door : patch.door && { ...patch.door, log: mergeAppend<LogEntry>(before.door?.log, patch.door.log) },
    updatedAt: Date.now()
  };
  const rows = (await sql()`
    UPDATE portal_jobs SET rep_id = ${next.rep}, status = ${next.status}, data = ${JSON.stringify(next)}::jsonb, updated_at = NOW()
    WHERE id = ${id} AND status = ${before.status} AND data->>'updatedAt' = ${String(before.updatedAt)}
    RETURNING id
  `) as unknown[];
  if (!rows.length) throw json({ error: "This job just changed. Refresh and try again." }, 409);
  if (patch.status && patch.status !== before.status) await logJobEvent(id, actorId, "status", { from: before.status, to: patch.status });
  if (patch.rep && patch.rep !== before.rep) await logJobEvent(id, actorId, "reassigned", { from: before.rep, to: patch.rep });
  if (patch.attn && !before.attn) await logJobEvent(id, actorId, "attention", patch.attn);
  if (next.requestId && patch.status === "completed") await updateRequest(next.requestId, { status: "completed" });
  // A rep passing on a job sends the request back to the Console queue so it can be dispatched again.
  if (next.requestId && patch.status === "declined") await updateRequest(next.requestId, { status: "new", jobId: undefined });
  return next;
}

/**
 * The only way a job's door state changes. A rep may ask (idle/denied → asked); only the member
 * whose request the job serves may answer (asked → ok | denied); the rep then opens and closes
 * (ok/closed → open, open → closed). Returns the updated job, or an error message.
 */
export async function setDoorState(
  jobId: string,
  to: "asked" | "ok" | "denied" | "open" | "closed",
  actor: { id: string; role: Role; name: string }
): Promise<{ job: Job } | { error: string; status: number }> {
  const job = await getJob(jobId);
  if (!job?.door) return { error: "This job has no smart door.", status: 404 };
  const from = job.door.state;
  const allowed: Record<string, { role: Role; from: string[] }> = {
    asked: { role: "rep", from: ["idle", "denied"] },
    ok: { role: "staff", from: ["asked"] },
    denied: { role: "staff", from: ["asked"] },
    open: { role: "rep", from: ["ok", "closed"] },
    closed: { role: "rep", from: ["open"] }
  };
  const rule = allowed[to];
  if (rule.role !== actor.role) return { error: "You can't change this door.", status: 403 };
  if (actor.role === "rep" && job.rep !== actor.id) return { error: "Job not found", status: 404 };
  if (actor.role === "staff") {
    const req = job.requestId ? await getRequest(job.requestId) : null;
    if (!req || req.memberId !== actor.id) return { error: "Job not found", status: 404 };
  }
  if (!rule.from.includes(from)) return { error: `The door is ${from}; it can't move to ${to}.`, status: 409 };
  const words: Record<string, string> = {
    asked: "Asked the member for door access",
    ok: `${actor.name} approved door access`,
    denied: `${actor.name} declined door access`,
    open: "Door unlocked",
    closed: "Door locked"
  };
  const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  const next = await updateJob(jobId, { door: { ...job.door, state: to, log: [[now, words[to]]] } }, actor.id);
  return next ? { job: next } : { error: "Job not found", status: 404 };
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

/** The reporting channel a request belongs to. Only "organization" can ever count toward Facility View. */
export function channelForSource(source: StaffRequest["source"]): RequestChannel {
  if (source === "concierge") return "concierge";
  if (source === "instant") return "instant";
  return "organization";
}

export async function createRequest(r: StaffRequest): Promise<StaffRequest> {
  // Instant requests have no account: member_id stays NULL.
  await sql()`
    INSERT INTO portal_requests (id, member_id, status, job_id, data, channel)
    VALUES (${r.id}, ${r.memberId || null}, ${r.status}, ${r.jobId ?? null}, ${JSON.stringify(r)}::jsonb, ${channelForSource(r.source)})
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

/** Active reps, online first, for the Console's dispatch and reassign pickers. */
export async function listReps(): Promise<RepSummary[]> {
  const rows = (await sql()`
    SELECT id, first_name, last_name, availability FROM portal_users WHERE role = 'rep' AND status = 'active'
    ORDER BY (availability = 'online') DESC, first_name, last_name
  `) as { id: string; first_name: string; last_name: string; availability: string }[];
  return rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    first: r.first_name,
    initials: initials(r.first_name, r.last_name),
    availability: r.availability === "online" ? "online" : "offline"
  }));
}

export async function setAvailability(userId: string, availability: "online" | "offline"): Promise<void> {
  await sql()`UPDATE portal_users SET availability = ${availability}, updated_at = NOW() WHERE id = ${userId} AND role = 'rep'`;
}

export async function isActiveRep(id: string): Promise<boolean> {
  const rows = (await sql()`SELECT 1 FROM portal_users WHERE id = ${id} AND role = 'rep' AND status = 'active'`) as unknown[];
  return rows.length > 0;
}

export type TeamMember = PortalUser & { createdAt: string; lastLoginAt: string | null; facilityName: string | null };

export async function listUsers(opts: { roles?: Role[] } = {}): Promise<TeamMember[]> {
  const roles = opts.roles ?? ["staff", "rep", "console", "facility_admin", "customer"];
  const rows = (await sql()`
    SELECT u.id, u.email, u.role, u.first_name, u.last_name, u.phone, u.status, u.facility_id,
           u.created_at, u.last_login_at, f.name AS facility_name
    FROM portal_users u LEFT JOIN portal_facilities f ON f.id = u.facility_id
    WHERE u.role = ANY(${roles})
    ORDER BY u.role, u.first_name, u.last_name
  `) as (Parameters<typeof toUser>[0] & { created_at: string | Date; last_login_at: string | Date | null; facility_name: string | null })[];
  const iso = (d: string | Date) => new Date(d).toISOString();
  return rows.map((r) => ({ ...toUser(r), createdAt: iso(r.created_at), lastLoginAt: r.last_login_at ? iso(r.last_login_at) : null, facilityName: r.facility_name }));
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

/**
 * Disabling also ends every session and voids unused invite/reset links. "active" is only applied
 * to users who have a password; an invited user who never set one goes back to "invited".
 */
export async function setUserStatus(id: string, status: UserStatus): Promise<void> {
  await sql()`
    UPDATE portal_users
    SET status = CASE WHEN ${status} = 'active' AND password_hash IS NULL THEN 'invited' ELSE ${status} END,
        failed_login_attempts = CASE WHEN ${status} = 'active' THEN 0 ELSE failed_login_attempts END,
        locked_until = CASE WHEN ${status} = 'active' THEN NULL ELSE locked_until END,
        updated_at = NOW()
    WHERE id = ${id}
  `;
  if (status === "disabled") {
    await sql()`DELETE FROM portal_sessions WHERE user_id = ${id}`;
    await sql()`UPDATE portal_password_tokens SET used_at = NOW() WHERE user_id = ${id} AND used_at IS NULL`;
  }
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
