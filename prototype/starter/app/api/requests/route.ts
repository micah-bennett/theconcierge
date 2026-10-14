import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { newRequestSchema } from "@/lib/validate";

export const dynamic = "force-dynamic";

/** Staff App "Ask HOP" requests. They land in the Concierge Console queue for dispatch. */
export async function GET() {
  return NextResponse.json(await store.listRequests(), { headers: { "Cache-Control": "no-store" } });
}

export async function POST(req: Request) {
  const parsed = newRequestSchema.safeParse(await req.json().catch(() => ({})));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const r = { ...parsed.data, id: "r" + crypto.randomUUID().slice(0, 8), createdAt: Date.now(), status: "new" as const };
  await store.createRequest(r);
  return NextResponse.json(r, { status: 201 });
}
