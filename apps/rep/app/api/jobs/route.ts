import { withAuth } from "@hop/shared/server/auth";
import { json } from "@hop/shared/server/db";
import { listJobs } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs -> only the jobs dispatched to the signed-in rep, without the ones they passed on.
 * Any ?rep= query is ignored on purpose: the rep comes from the session, never the URL.
 */
export const GET = withAuth(APP_ROLE, async (_request, user) => {
  return json({ jobs: await listJobs({ repId: user.id }) });
});
