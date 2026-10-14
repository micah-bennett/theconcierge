import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { notify } from "@hop/shared/server/integrations/push";
import { getJob, isActiveRep, updateJob } from "@hop/shared/server/store";
import { consolePatchJobSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/jobs/:id → the Console reassigns a job or edits its status, log, notes or attention flag.
 * consolePatchJobSchema is strict: proof (photos, signature) and door state stay rep-only.
 */
export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(APP_ROLE, async (request, user, ctx) => {
  const { id } = await ctx.params;
  const parsed = consolePatchJobSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const patch = parsed.data;

  const before = await getJob(id);
  if (!before) return json({ error: "Job not found" }, 404);
  if (patch.rep && patch.rep !== before.rep && !(await isActiveRep(patch.rep))) return json({ error: "Pick an active rep." }, 400);

  const job = await updateJob(id, patch, user.id);
  if (!job) return json({ error: "Job not found" }, 404);
  if (patch.rep && patch.rep !== before.rep) await notify(patch.rep, "New job from dispatch", job.title);
  return json(job);
});
