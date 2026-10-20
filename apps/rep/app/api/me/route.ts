import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { postMessage } from "@hop/shared/server/messages";
import { notify } from "@hop/shared/server/integrations/push";
import { createRequest, listJobs, newId, setAvailability } from "@hop/shared/server/store";
import type { StaffRequest } from "@hop/shared/types";
import { APP_ROLE } from "@/lib/app";
import { loadRepStats, supportPhone } from "@/lib/server/me";
import { ACTIVE_STATUSES } from "@/lib/server/rules";

export const dynamic = "force-dynamic";

const availabilitySchema = z.object({ availability: z.enum(["online", "offline"]) }).strict();
const safetySchema = z
  .object({ note: z.string().max(400).transform((s) => s.replace(/[<>`]/g, "").trim()).optional() })
  .strict();

/**
 * GET /api/me -> { user, availability, rating: { avg, count }, doneToday, supportPhone }
 * Everything is for the signed-in rep; nothing is read from the query string.
 */
export const GET = withAuth(APP_ROLE, async (_request, user) => {
  return json({ user, ...(await loadRepStats(user.id)), supportPhone: supportPhone() });
});

/**
 * POST /api/me?action=availability { availability: "online" | "offline" } -> { availability }
 *   Saves portal_users.availability, which the Console's rep picker reads (online first).
 * POST /api/me?action=safety { note? } -> { ok, requestId, messageId, supportPhone }
 *   Posts an urgent message in the rep's HQ thread (rep/<id>) and opens an urgent Console request
 *   (source "safety") so the alert shows in both places.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const action = new URL(request.url).searchParams.get("action");

  if (action === "availability") {
    const parsed = availabilitySchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
    await setAvailability(user.id, parsed.data.availability);
    return json({ availability: parsed.data.availability });
  }

  if (action === "safety") {
    const parsed = safetySchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
    const note = parsed.data.note || "Rep asked for help";
    const active = (await listJobs({ repId: user.id })).find((j) => ACTIVE_STATUSES.includes(j.status));
    const text = `Safety alert: ${note}${active ? ` (job ${active.title})` : ""}`;
    const name = `${user.firstName} ${user.lastName}`.trim();

    const message = await postMessage(user, "rep", user.id, text, { urgent: true });
    const r: StaffRequest = {
      id: newId("r"),
      memberId: user.id,
      member: name,
      role: "Concierge rep",
      cat: "errand",
      text,
      urgent: true,
      window: "Right now",
      source: "safety",
      createdAt: Date.now(),
      status: "new"
    };
    await createRequest(r);
    // TODO(IT): push alerts are a stub until a provider is chosen (integrations/push.ts).
    await notify("console", "Safety alert", `${name}: ${text}`);
    return json({ ok: true, requestId: r.id, messageId: message.id, supportPhone: supportPhone() }, 201);
  }

  return json({ error: "Unknown action" }, 400);
});
