import { NextResponse } from "next/server";
import { createMaskedSession } from "@/lib/integrations/twilio";

export const dynamic = "force-dynamic";

/** POST /api/calls { jobId, memberPhone } -> masked number for the rep to call or text. */
export async function POST(req: Request) {
  const { jobId, memberPhone } = (await req.json().catch(() => ({}))) as { jobId?: string; memberPhone?: string };
  if (!jobId) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  return NextResponse.json(await createMaskedSession(jobId, memberPhone ?? "", ""));
}
