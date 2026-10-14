import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { notify } from "@hop/shared/server/integrations/push";
import { createJob, getRequest, isActiveRep, listJobs, newId } from "@hop/shared/server/store";
import { nowTA } from "@hop/shared/time";
import type { Job } from "@hop/shared/types";
import { newJobSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";
import { listConsoleReps } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** GET /api/jobs → every job (most recently updated first) plus every rep, so the UI can name them. */
export const GET = withAuth(APP_ROLE, async () => {
  const [jobs, reps] = await Promise.all([listJobs(), listConsoleReps()]);
  return json({ jobs, reps });
});

/**
 * POST /api/jobs → dispatch a new trip or request to one rep.
 * The rep must be an active rep user. With `requestId`, the request must still be waiting
 * (status new); createJob() then marks it dispatched and links the job.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = newJobSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const { requestId, ...b } = parsed.data;

  if (!(await isActiveRep(b.rep))) return json({ error: "Pick an active rep." }, 400);
  if (requestId) {
    const req = await getRequest(requestId);
    if (!req) return json({ error: "That staff request no longer exists." }, 404);
    if (req.status !== "new") return json({ error: "That staff request was already dispatched or closed." }, 409);
  }

  const job: Job = {
    ...b,
    id: newId("d"),
    requestId: requestId ?? null,
    status: "offer",
    sentAt: b.sentAt || nowTA(),
    log: [],
    updates: [],
    photos: [],
    sig: null,
    signedBy: null,
    notesList: [],
    done: {},
    attn: null,
    share: true,
    updatedAt: Date.now()
  };
  await createJob(job, user.id);
  await notify(job.rep, "New job from dispatch", job.title);
  return json(job, 201);
});
