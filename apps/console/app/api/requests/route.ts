import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { getRequest, updateRequest } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";
import { listConsoleRequests } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/** GET /api/requests → every staff request, newest first, with member name, job title, phone and shared prefs. */
export const GET = withAuth(APP_ROLE, async () => {
  return json({ requests: await listConsoleRequests() });
});

/*
 * PATCH /api/requests?id=… → { status: "cancelled" } cancels a waiting request; { status: "new" } reopens a
 * cancelled one. "dispatched" and "completed" are set only by the jobs flow (createJob / updateJob).
 */
const patchSchema = z.object({ status: z.enum(["new", "cancelled"]) }).strict();
const ALLOWED_FROM: Record<string, string> = { cancelled: "new", new: "cancelled" };

export const PATCH = withAuth(APP_ROLE, async (request) => {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id || id.length > 40) return json({ error: "Missing request id" }, 400);
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);

  const cur = await getRequest(id);
  if (!cur) return json({ error: "Request not found" }, 404);
  const to = parsed.data.status;
  if (cur.status === to) return json(cur);
  if (cur.status !== ALLOWED_FROM[to]) {
    return json({ error: to === "cancelled" ? "Only a waiting request can be cancelled." : "Only a cancelled request can be reopened." }, 409);
  }
  return json(await updateRequest(id, { status: to }));
});
