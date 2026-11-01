import "server-only";
import { sql } from "@hop/shared/server/db";

/**
 * Cancels one of my requests, only while it is still waiting (status new, no job yet).
 * One conditional UPDATE, so a Console dispatching the same request at the same moment can't race
 * it: whichever lands first wins (createJob claims with `WHERE status = 'new'` too).
 * Returns false when the request isn't mine or is no longer waiting.
 */
export async function cancelMyRequest(memberId: string, requestId: string): Promise<boolean> {
  const rows = (await sql()`
    UPDATE portal_requests
    SET status = 'cancelled', data = data || '{"status":"cancelled"}'::jsonb, updated_at = NOW()
    WHERE id = ${requestId} AND member_id = ${memberId} AND status = 'new' AND job_id IS NULL
    RETURNING id
  `) as unknown[];
  return rows.length > 0;
}
