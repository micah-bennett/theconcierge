import "server-only";
import { sql } from "@hop/shared/server/db";

export type Availability = "online" | "offline";
export type RepStats = { availability: Availability; rating: { avg: number | null; count: number }; doneToday: number };

/** The HOP support line reps can call from Safety help. Hidden in the app when unset. */
export const supportPhone = () => (process.env.HOP_SUPPORT_PHONE || "").trim() || null;

/**
 * The signed-in rep's live numbers, all from the database:
 * - availability: portal_users.availability
 * - rating: the average and count of portal_ratings for this rep
 * - doneToday: jobs of theirs whose status moved to completed today (America/New_York), from the
 *   job's status events rather than updatedAt (a note added later doesn't move it).
 */
export async function loadRepStats(repId: string): Promise<RepStats> {
  const db = sql();
  const [u, r, d] = await Promise.all([
    db`SELECT availability FROM portal_users WHERE id = ${repId}`,
    db`SELECT AVG(stars)::float8 AS avg, COUNT(*)::int AS count FROM portal_ratings WHERE rep_id = ${repId}`,
    db`
      SELECT COUNT(DISTINCT e.job_id)::int AS n
      FROM portal_job_events e JOIN portal_jobs j ON j.id = e.job_id
      WHERE j.rep_id = ${repId} AND e.kind = 'status' AND e.detail->>'to' = 'completed'
        AND (e.at AT TIME ZONE 'America/New_York')::date = (NOW() AT TIME ZONE 'America/New_York')::date
    `
  ]);
  const user = u as { availability: string }[];
  const rating = r as { avg: number | null; count: number }[];
  const done = d as { n: number }[];
  const count = Number(rating[0]?.count ?? 0);
  return {
    availability: user[0]?.availability === "online" ? "online" : "offline",
    rating: { avg: count && rating[0]?.avg != null ? Math.round(Number(rating[0].avg) * 10) / 10 : null, count },
    doneToday: Number(done[0]?.n ?? 0)
  };
}
