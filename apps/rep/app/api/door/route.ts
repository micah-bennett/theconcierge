import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { lockForJob, unlockForJob } from "@hop/shared/server/integrations/seam";
import { getJob, logDoorEvent, setDoorState, updateJob } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";
import { ACTIVE_STATUSES } from "@/lib/server/rules";

export const dynamic = "force-dynamic";

const doorSchema = z.object({ jobId: z.string().min(1).max(40), action: z.enum(["ask", "unlock", "lock"]) }).strict();

const TO = { ask: "asked", unlock: "open", lock: "closed" } as const;
const MEMBER_UPDATE = { ask: null, unlock: "Door unlocked, entering now", lock: "Door locked behind me" } as const;

/**
 * POST /api/door { jobId, action: "ask" | "unlock" | "lock" } -> { job, seam? }
 * The rep's own job only, while it's active, and only if it has a smart door. Door state changes
 * only through setDoorState(), which enforces who may move it and from where:
 *   ask    idle | denied → asked   (the member answers in HOP Client: asked → ok | denied)
 *   unlock ok | closed   → open    + a portal_door_events row + the Seam stub
 *   lock   open          → closed  + a portal_door_events row + the Seam stub
 * Errors: 400 bad body / no door, 404 not your job, 409 not active or wrong door state.
 *
 * TODO(IT): before real Seam calls, enforce the approved time window here and relock after 10 min.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = doorSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const { jobId, action } = parsed.data;

  const job = await getJob(jobId, { repId: user.id });
  if (!job) return json({ error: "Job not found" }, 404);
  if (!job.door) return json({ error: "This job has no smart door." }, 400);
  if (!ACTIVE_STATUSES.includes(job.status)) return json({ error: "Door access only works while the job is active." }, 409);

  const res = await setDoorState(job.id, TO[action], { id: user.id, role: "rep", name: `${user.firstName} ${user.lastName.slice(0, 1)}.`.trim() });
  if ("error" in res) return json({ error: res.error }, res.status);
  let next = res.job;
  if (action === "ask") return json({ job: next });

  await logDoorEvent(job.id, user.id, action);
  const deviceId = ""; // TODO(IT): the member's Seam device id for this job.
  const seam = action === "unlock" ? await unlockForJob(deviceId, job.id, user.id) : await lockForJob(deviceId, job.id, user.id);

  // Also tell the member in their status feed. The door change above already stands if this loses a race.
  const now = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZone: "America/New_York" });
  try {
    next = (await updateJob(job.id, { updates: [[now, MEMBER_UPDATE[action]]] }, user.id, { repId: user.id })) ?? next;
  } catch {
    /* 409: someone else just wrote the job; the door log still has the event. */
  }
  return json({ job: next, seam });
});
