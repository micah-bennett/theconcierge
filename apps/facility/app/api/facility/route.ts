import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { APP_ROLE } from "@/lib/app";
import { ALL_ACTIONS, METRICS, RANGES } from "@/lib/server/aggregate";
import { loadFacilityView, resolveSupport, sendSupport } from "@/lib/server/facility";

export const dynamic = "force-dynamic";

/*
 * GET  /api/facility?metric=strain|stress|missed_breaks|requests&range=today|week|next
 * POST /api/facility?action=support  { unitId, actions: string[] }
 * POST /api/facility?action=resolve  { unitId }
 *
 * The facility is always the signed-in admin's own (user.facilityId). There is deliberately no
 * parameter that names a facility.
 */

const querySchema = z.object({
  metric: z.enum(METRICS).catch("strain"),
  range: z.enum(RANGES).catch("today")
});

const supportSchema = z.object({
  unitId: z.string().uuid("Pick a unit"),
  actions: z
    .array(z.string().refine((a) => ALL_ACTIONS.includes(a), "Pick from the suggested support"))
    .min(1, "Pick at least one kind of support")
    .max(ALL_ACTIONS.length)
    .transform((a) => [...new Set(a)])
});

const resolveSchema = z.object({ unitId: z.string().uuid("Pick a unit") });

function myFacility(user: { facilityId: string | null }): string {
  if (!user.facilityId) throw json({ error: "Your account isn't linked to a facility yet. Ask HOP to attach one." }, 403);
  return user.facilityId;
}

export const GET = withAuth(APP_ROLE, async (request, user) => {
  const facilityId = myFacility(user);
  const url = new URL(request.url);
  const q = querySchema.parse({ metric: url.searchParams.get("metric") ?? undefined, range: url.searchParams.get("range") ?? undefined });
  const view = await loadFacilityView(facilityId, q.metric, q.range);
  if (!view) return json({ error: "Facility not found" }, 404);
  return json(view);
});

export const POST = withAuth(APP_ROLE, async (request, user) => {
  const facilityId = myFacility(user);
  const action = new URL(request.url).searchParams.get("action");

  if (action === "support") {
    const parsed = supportSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
    const r = await sendSupport({ ...user, facilityId }, parsed.data.unitId, parsed.data.actions);
    if ("error" in r) return json({ error: r.error }, r.status);
    return json(r, 201);
  }

  if (action === "resolve") {
    const parsed = resolveSchema.safeParse(await readJson(request));
    if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
    const n = await resolveSupport(facilityId, parsed.data.unitId);
    if (!n) return json({ error: "There's no open support for that unit" }, 404);
    return json({ ok: true });
  }

  return json({ error: "Unknown action" }, 400);
});
