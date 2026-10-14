import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { patchJobSchema } from "@/lib/validate";
import { notify } from "@/lib/integrations/push";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/jobs/:id -> rep updates status, tracking, proof, notes, door state.
 * Console uses it to reassign. TODO(IT): check the caller owns this job (rep) or is console staff.
 */
export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const parsed = patchJobSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const before = await store.getJob(id);
  if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const job = await store.updateJob(id, parsed.data);
  if (job && parsed.data.status && parsed.data.status !== before.status) {
    await notify(job.client, "HOP update", `${job.title}: ${parsed.data.status.replace("_", " ")}`);
  }
  if (job && parsed.data.attn && !before.attn) await notify("console", "Needs attention", `${job.title}: ${parsed.data.attn.r}`);
  return NextResponse.json(job);
}
