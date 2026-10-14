import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { notify } from "@hop/shared/server/integrations/push";
import { getJob, updateJob } from "@hop/shared/server/store";
import { repPatchJobSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";
import { checkRepPatch } from "@/lib/server/rules";

export const dynamic = "force-dynamic";

/** Under Vercel's 4.5 MB request limit. Photos are downscaled on the phone (lib/image.ts). */
const MAX_BODY = 4_400_000;

/**
 * PATCH /api/jobs/:id -> the signed-in rep updates their own job.
 * - repPatchJobSchema is strict: `rep` or any request field in the body is a 400.
 * - Someone else's job (or no such job) is a 404, from the rep_id in the SQL WHERE.
 * - Status moves are forward only (REP_STATUS_MOVES); completing needs the required proof.
 */
export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(APP_ROLE, async (request, user, ctx) => {
  const { id } = await ctx.params;
  const parsed = repPatchJobSchema.safeParse(await readJson(request, MAX_BODY));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const patch = parsed.data;

  const before = await getJob(id, { repId: user.id });
  if (!before) return json({ error: "Job not found" }, 404);

  const problem = checkRepPatch(before, patch);
  if (problem) return json({ error: problem }, 400);

  const job = await updateJob(id, patch, user.id, { repId: user.id });
  if (!job) return json({ error: "Job not found" }, 404);

  // TODO(IT): push alerts. Both are stubs until a provider is chosen (integrations/push.ts).
  if (patch.status && patch.status !== before.status) {
    await notify(job.client, "HOP update", `${job.title}: ${patch.status.replace("_", " ")}`);
  }
  if (patch.attn && !before.attn) await notify("console", "Needs attention", `${job.title}: ${patch.attn.r}`);
  return json(job);
});
