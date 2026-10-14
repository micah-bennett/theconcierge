import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { newJobSchema } from "@/lib/validate";
import { notify } from "@/lib/integrations/push";
import { nowTA } from "@/lib/time";
import type { Job } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * GET /api/jobs            -> every job (Concierge Console)
 * GET /api/jobs?rep=renee  -> only jobs dispatched to that rep (Rep App)
 * TODO(IT): derive the rep from the signed-in session instead of the query string,
 * and only allow the console role to list every job.
 */
export async function GET(req: Request) {
  const rep = new URL(req.url).searchParams.get("rep") ?? undefined;
  return NextResponse.json(await store.listJobs(rep), { headers: { "Cache-Control": "no-store" } });
}

/** POST /api/jobs -> console dispatches a new trip or request to one rep. */
export async function POST(req: Request) {
  const parsed = newJobSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const { requestId, ...b } = parsed.data;
  const job: Job = {
    ...b,
    id: "d" + crypto.randomUUID().slice(0, 8),
    status: "offer",
    sentAt: b.sentAt ?? nowTA(),
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
  await store.createJob(job);
  if (requestId) await store.updateRequest(requestId, { status: "dispatched", jobId: job.id });
  await notify(job.rep, "New job from dispatch", job.title);
  return NextResponse.json(job, { status: 201 });
}
