import "server-only";
import { sql } from "@hop/shared/server/db";
import type { JobStatus, LogEntry, StaffRequest } from "@hop/shared/types";
import type { MyReq } from "../types";

/**
 * The signed-in member's requests with their job's live progress. Same as the shared
 * listMyRequests (ownership in the WHERE), plus the job's window, attention flag and
 * client-facing updates so "My requests" can show an ETA and a timeline.
 */
export async function listMyRequestsDetailed(memberId: string): Promise<MyReq[]> {
  const rows = (await sql()`
    SELECT r.data, j.status AS job_status, u.first_name AS rep_first,
           j.data->>'window' AS job_window,
           COALESCE(jsonb_typeof(j.data->'attn') = 'object', false) AS attn,
           COALESCE(j.data->'updates', '[]'::jsonb) AS updates
    FROM portal_requests r
    LEFT JOIN portal_jobs j ON j.id = r.job_id
    LEFT JOIN portal_users u ON u.id = j.rep_id
    WHERE r.member_id = ${memberId}
    ORDER BY r.created_at DESC LIMIT 50
  `) as { data: StaffRequest; job_status: JobStatus | null; rep_first: string | null; job_window: string | null; attn: boolean; updates: LogEntry[] }[];
  return rows.map((r) => ({
    ...r.data,
    jobStatus: r.job_status,
    repFirst: r.rep_first,
    jobWindow: r.job_window,
    attn: !!r.attn,
    updates: Array.isArray(r.updates) ? r.updates.slice(-20) : []
  }));
}
