import { NextResponse } from "next/server";
import { lockForJob, unlockForJob } from "@/lib/integrations/seam";

export const dynamic = "force-dynamic";

/** POST /api/door { jobId, action: "unlock" | "lock", deviceId } — see lib/integrations/seam.ts for the rules. */
export async function POST(req: Request) {
  const { jobId, action, deviceId } = (await req.json().catch(() => ({}))) as { jobId?: string; action?: string; deviceId?: string };
  if (!jobId || (action !== "unlock" && action !== "lock")) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const actor = "rep"; // TODO(IT): signed-in rep id
  const r = action === "unlock" ? await unlockForJob(deviceId ?? "", jobId, actor) : await lockForJob(deviceId ?? "", jobId, actor);
  return NextResponse.json(r);
}
