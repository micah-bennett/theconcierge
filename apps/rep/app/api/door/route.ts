import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { lockForJob, unlockForJob } from "@hop/shared/server/integrations/seam";
import { getJob, logDoorEvent } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";
import { ACTIVE_STATUSES } from "@/lib/server/rules";

export const dynamic = "force-dynamic";

const doorSchema = z.object({ jobId: z.string().min(1).max(40), action: z.enum(["unlock", "lock"]) }).strict();

/**
 * POST /api/door { jobId, action: "unlock" | "lock" }
 * Only for the signed-in rep's own job, while it's active, and only if the job has a smart door.
 * Writes a portal_door_events row, then calls the Seam stub.
 *
 * TODO(IT): the rules from integrations/seam.ts, enforced here before the real Seam call:
 *  1. The member approves access for ONE job and ONE time window (today the approval is simulated
 *     in the Rep App, so door.state "ok" is only a hint, not proof of consent).
 *  2. The unlock only works inside that window, then the lock relocks on its own (10 min).
 *  3. Every unlock and lock is written to portal_door_events (done) and shown to the member.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = doorSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const { jobId, action } = parsed.data;

  const job = await getJob(jobId, { repId: user.id });
  if (!job) return json({ error: "Job not found" }, 404);
  if (!job.door) return json({ error: "This job has no smart door." }, 400);
  if (!ACTIVE_STATUSES.includes(job.status)) return json({ error: "Door access only works while the job is active." }, 409);
  if (action === "unlock" && !["ok", "closed", "open"].includes(job.door.state)) {
    return json({ error: "The client hasn't approved door access yet." }, 409);
  }

  await logDoorEvent(job.id, user.id, action);
  const deviceId = ""; // TODO(IT): the member's Seam device id for this job.
  const result = action === "unlock" ? await unlockForJob(deviceId, job.id, user.id) : await lockForJob(deviceId, job.id, user.id);
  return json(result);
});
