import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { getRequest, updateRequest } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";
import { consoleStats, listConsoleRequests } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

/**
 * GET /api/requests → { requests, stats }
 *   requests: every staff request, newest first, with member name, job title, phone and shared prefs.
 *   stats:    the live KPI numbers (today's volume by service, avg response, service rating).
 */
export const GET = withAuth(APP_ROLE, async () => {
  const [requests, stats] = await Promise.all([listConsoleRequests(), consoleStats()]);
  return json({ requests, stats });
});

/*
 * PATCH /api/requests?id=… →
 *   { status: "cancelled" } cancels a waiting request; { status: "new" } reopens a cancelled one;
 *   { status: "completed" } marks a waiting safety alert handled (source 'safety' only).
 * "dispatched" and other completions are set only by the jobs flow (createJob / updateJob).
 */
const patchSchema = z.object({ status: z.enum(["new", "cancelled", "completed"]) }).strict();
const ALLOWED_FROM: Record<string, string> = { cancelled: "new", new: "cancelled", completed: "new" };

export const PATCH = withAuth(APP_ROLE, async (request) => {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!id || id.length > 40) return json({ error: "Missing request id" }, 400);
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);

  const cur = await getRequest(id);
  if (!cur) return json({ error: "Request not found" }, 404);
  const to = parsed.data.status;
  if (cur.status === to) return json(cur);
  if (to === "completed" && cur.source !== "safety") return json({ error: "Only a safety alert can be marked handled here." }, 409);
  if (cur.status !== ALLOWED_FROM[to]) {
    const msg = { cancelled: "Only a waiting request can be cancelled.", new: "Only a cancelled request can be reopened.", completed: "Only a waiting safety alert can be marked handled." }[to];
    return json({ error: msg }, 409);
  }
  return json(await updateRequest(id, { status: to }));
});
