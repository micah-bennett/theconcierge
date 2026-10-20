import "server-only";
import { sql } from "@hop/shared/server/db";
import type { JobStatus, LogEntry, StaffRequest } from "@hop/shared/types";
import type { DoorState, MyReq } from "../types";

/** Rep-side prefixes that shouldn't show in the member's timeline. */
const cleanUpdate = (t: string) => t.replace(/^(Sent|Client notified):\s*/i, "");

/**
 * The signed-in member's requests with their job's live progress. Same as the shared
 * listMyRequests (ownership in the WHERE), plus the job's window, attention flag, client-facing
 * updates, door state, photo count and my rating. Photos themselves are loaded on demand
 * (listRequestPhotos), because inline data URLs are large and this list is polled.
 */
export async function listMyRequestsDetailed(memberId: string): Promise<MyReq[]> {
  const rows = (await sql()`
    SELECT r.data, r.job_id, j.status AS job_status, u.first_name AS rep_first,
           j.data->>'window' AS job_window,
           COALESCE(jsonb_typeof(j.data->'attn') = 'object', false) AS attn,
           COALESCE(j.data->'updates', '[]'::jsonb) AS updates,
           j.data->'door'->>'state' AS door_state,
           j.data->'door'->>'kind' AS door_kind,
           CASE WHEN jsonb_typeof(j.data->'photos') = 'array' THEN jsonb_array_length(j.data->'photos') ELSE 0 END AS photo_count,
           rt.stars AS rating
    FROM portal_requests r
    LEFT JOIN portal_jobs j ON j.id = r.job_id
    LEFT JOIN portal_users u ON u.id = j.rep_id
    LEFT JOIN portal_ratings rt ON rt.request_id = r.id AND rt.member_id = ${memberId}
    WHERE r.member_id = ${memberId}
    ORDER BY r.created_at DESC LIMIT 50
  `) as {
    data: StaffRequest;
    job_id: string | null;
    job_status: JobStatus | null;
    rep_first: string | null;
    job_window: string | null;
    attn: boolean;
    updates: LogEntry[];
    door_state: DoorState | null;
    door_kind: string | null;
    photo_count: number;
    rating: number | null;
  }[];
  return rows.map((r) => ({
    ...r.data,
    jobId: r.job_id ?? r.data.jobId,
    jobStatus: r.job_status,
    repFirst: r.rep_first,
    jobWindow: r.job_window,
    attn: !!r.attn,
    updates: Array.isArray(r.updates) ? r.updates.slice(-20).map(([t, x]) => [t, cleanUpdate(String(x))] as LogEntry) : [],
    doorState: r.door_state,
    doorKind: r.door_kind,
    photoCount: Number(r.photo_count) || 0,
    rating: r.rating == null ? null : Number(r.rating)
  }));
}

/** The rep's proof photos on one of my requests (completed jobs only). [] if not mine. */
export async function listRequestPhotos(memberId: string, requestId: string): Promise<string[]> {
  const rows = (await sql()`
    SELECT j.data->'photos' AS photos
    FROM portal_requests r JOIN portal_jobs j ON j.id = r.job_id
    WHERE r.id = ${requestId} AND r.member_id = ${memberId} AND j.status = 'completed'
  `) as { photos: unknown }[];
  const p = rows[0]?.photos;
  return Array.isArray(p) ? p.filter((x): x is string => typeof x === "string").slice(0, 6) : [];
}
