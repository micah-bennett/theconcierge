import "server-only";
import { sql } from "@hop/shared/server/db";
import type { StaffRequest, ThreadKind } from "@hop/shared/types";
import type { ConsoleRep, ConsoleRequest, ConsoleStats, MemberPref } from "../types";

/*
 * Console-only queries that @hop/shared/server/store doesn't have. Everything here is called from
 * route handlers wrapped in withAuth("console"), so the caller is already a signed-in console user.
 */

const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase();
const round1 = (x: number) => Math.round(Number(x) * 10) / 10;

/**
 * Every rep (active or not), active first, then online first. The UI dispatches only to active ones,
 * but needs the others' names for jobs they already hold. store.listReps() returns active reps only.
 * Each rep carries their online toggle and all-time average rating from portal_ratings.
 */
export async function listConsoleReps(): Promise<ConsoleRep[]> {
  const rows = (await sql()`
    SELECT u.id, u.first_name, u.last_name, u.status, u.availability, rt.avg_stars, rt.n
    FROM portal_users u
    LEFT JOIN (
      SELECT rep_id, avg(stars)::float8 AS avg_stars, count(*)::int AS n
      FROM portal_ratings WHERE rep_id IS NOT NULL GROUP BY rep_id
    ) rt ON rt.rep_id = u.id
    WHERE u.role = 'rep'
    ORDER BY (u.status = 'active') DESC, (u.availability = 'online') DESC, u.first_name, u.last_name
  `) as {
    id: string;
    first_name: string;
    last_name: string;
    status: string;
    availability: string | null;
    avg_stars: number | null;
    n: number | null;
  }[];
  return rows.map((r) => ({
    id: r.id,
    name: `${r.first_name} ${r.last_name}`,
    first: r.first_name,
    initials: initials(r.first_name, r.last_name),
    availability: r.availability === "online" ? "online" : "offline",
    active: r.status === "active",
    rating: r.avg_stars == null ? null : round1(r.avg_stars),
    ratings: Number(r.n ?? 0)
  }));
}

/**
 * The live KPI numbers:
 *  - volumeToday: requests created since midnight America/New_York, by data->>'cat', plus jobs the
 *    console created directly (no request), by their cat.
 *  - response: per request created in the last 7 days, minutes from created_at to the first
 *    'accepted' status event on any of its jobs (a passed-then-redispatched request counts its
 *    first acceptance). Median and mean.
 *  - rating: average stars over the last 30 days.
 */
export async function consoleStats(): Promise<ConsoleStats> {
  const [volumeRows, responseRows, ratingRows] = await Promise.all([
    sql()`
      WITH b AS (SELECT (date_trunc('day', NOW() AT TIME ZONE 'America/New_York') AT TIME ZONE 'America/New_York') AS start)
      SELECT cat, count(*)::int AS n FROM (
        SELECT r.data->>'cat' AS cat FROM portal_requests r, b WHERE r.created_at >= b.start
        UNION ALL
        SELECT j.data->>'cat' AS cat FROM portal_jobs j, b WHERE j.created_at >= b.start AND j.request_id IS NULL
      ) x
      GROUP BY cat ORDER BY n DESC, cat
    `,
    sql()`
      SELECT percentile_cont(0.5) WITHIN GROUP (ORDER BY m)::float8 AS median, avg(m)::float8 AS avg, count(*)::int AS n
      FROM (
        SELECT EXTRACT(EPOCH FROM (min(e.at) - r.created_at)) / 60 AS m
        FROM portal_requests r
        JOIN portal_jobs j ON j.request_id = r.id
        JOIN portal_job_events e ON e.job_id = j.id AND e.kind = 'status' AND e.detail->>'to' = 'accepted'
        WHERE r.created_at >= NOW() - INTERVAL '7 days'
        GROUP BY r.id, r.created_at
      ) t
    `,
    sql()`
      SELECT avg(stars)::float8 AS avg, count(*)::int AS n FROM portal_ratings WHERE at >= NOW() - INTERVAL '30 days'
    `
  ]);
  const volume = volumeRows as { cat: string | null; n: number }[];
  const response = responseRows as { median: number | null; avg: number | null; n: number }[];
  const rating = ratingRows as { avg: number | null; n: number }[];
  const resp = response[0];
  const rate = rating[0];
  return {
    volumeToday: volume.map((v) => ({ cat: v.cat || "other", count: Number(v.n) })),
    response:
      resp && Number(resp.n) > 0 && resp.median != null && resp.avg != null
        ? { medianMin: round1(Math.max(0, resp.median)), avgMin: round1(Math.max(0, resp.avg)), count: Number(resp.n) }
        : null,
    rating: rate && Number(rate.n) > 0 && rate.avg != null ? { avg: round1(rate.avg), count: Number(rate.n) } : null
  };
}

/** Every request, newest first, with the member's phone and the preferences they chose to share. */
export async function listConsoleRequests(): Promise<ConsoleRequest[]> {
  const rows = (await sql()`
    SELECT r.data, u.first_name, u.last_name, u.phone, p.job_title, p.prefs
    FROM portal_requests r
    LEFT JOIN portal_users u ON u.id = r.member_id
    LEFT JOIN portal_staff_profiles p ON p.user_id = r.member_id
    ORDER BY r.created_at DESC
    LIMIT 200
  `) as {
    data: StaffRequest;
    first_name: string | null;
    last_name: string | null;
    phone: string | null;
    job_title: string | null;
    prefs: unknown;
  }[];
  return rows.map((r) => {
    const fallbackName = r.first_name ? `${r.first_name} ${r.last_name ?? ""}`.trim() : "";
    const prefs = Array.isArray(r.prefs) ? (r.prefs as MemberPref[]).filter((p) => p && typeof p.v === "string") : [];
    return {
      ...r.data,
      member: r.data.member || fallbackName || "Staff member",
      role: r.data.role || r.job_title || "",
      memberPhone: r.phone || "",
      memberPrefs: prefs.slice(0, 8)
    };
  });
}

/**
 * Re-links a waiting request to a job (new → dispatched). Used when the console reassigns a job a
 * rep passed on (the shared store sent that request back to 'new'). Conditional, like createJob():
 * false if the request was dispatched again or closed in the meantime.
 */
export async function claimRequest(requestId: string, jobId: string): Promise<boolean> {
  const rows = (await sql()`
    UPDATE portal_requests
    SET status = 'dispatched', job_id = ${jobId},
        data = data || ${JSON.stringify({ status: "dispatched", jobId })}::jsonb, updated_at = NOW()
    WHERE id = ${requestId} AND status = 'new'
    RETURNING id
  `) as unknown[];
  return rows.length > 0;
}

/** Undoes claimRequest() when the job update that followed it failed. */
export async function releaseRequest(requestId: string, jobId: string): Promise<void> {
  await sql()`
    UPDATE portal_requests
    SET status = 'new', job_id = NULL, data = (data - 'jobId') || '{"status":"new"}'::jsonb, updated_at = NOW()
    WHERE id = ${requestId} AND job_id = ${jobId} AND status = 'dispatched'
  `;
}

/**
 * Threads with an urgent message (a rep's safety alert, say) newer than the console team's last
 * reply in that thread, as "kind/key". The inbox pins these until someone answers.
 */
export async function urgentThreadKeys(): Promise<Set<string>> {
  const rows = (await sql()`
    SELECT m.thread_kind, m.thread_key FROM portal_messages m
    WHERE m.urgent AND m.id > COALESCE((
      SELECT max(c.id) FROM portal_messages c
      WHERE c.thread_kind = m.thread_kind AND c.thread_key = m.thread_key AND c.sender_role = 'console'
    ), 0)
    GROUP BY m.thread_kind, m.thread_key
  `) as { thread_kind: ThreadKind; thread_key: string }[];
  return new Set(rows.map((r) => `${r.thread_kind}/${r.thread_key}`));
}

/** Average rating per rep id, all time (for the Team screen). */
export async function repRatings(): Promise<Map<string, { rating: number; ratings: number }>> {
  const rows = (await sql()`
    SELECT rep_id, avg(stars)::float8 AS avg_stars, count(*)::int AS n FROM portal_ratings WHERE rep_id IS NOT NULL GROUP BY rep_id
  `) as { rep_id: string; avg_stars: number; n: number }[];
  return new Map(rows.map((r) => [r.rep_id, { rating: round1(r.avg_stars), ratings: Number(r.n) }]));
}

/** Rep availability toggles by id (for the Team screen). */
export async function repAvailability(): Promise<Map<string, "online" | "offline">> {
  const rows = (await sql()`SELECT id, availability FROM portal_users WHERE role = 'rep'`) as { id: string; availability: string | null }[];
  return new Map(rows.map((r) => [r.id, r.availability === "online" ? "online" : "offline"]));
}

/** Turns a user back on: active if they have set a password, otherwise back to invited. Clears any lockout. */
export async function enableUser(id: string): Promise<void> {
  await sql()`
    UPDATE portal_users
    SET status = CASE WHEN password_hash IS NULL THEN 'invited' ELSE 'active' END,
        failed_login_attempts = 0, locked_until = NULL, updated_at = NOW()
    WHERE id = ${id}
  `;
}

/** Voids any unused invite links for a user (before a resend, or when disabling them). */
export async function voidInviteTokens(userId: string): Promise<void> {
  await sql()`UPDATE portal_password_tokens SET used_at = NOW() WHERE user_id = ${userId} AND purpose = 'invite' AND used_at IS NULL`;
}
