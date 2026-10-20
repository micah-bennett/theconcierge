import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { createRequest, newId } from "@hop/shared/server/store";
import type { StaffRequest } from "@hop/shared/types";
import { newRequestSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";
import { getJobTitle } from "@/lib/server/profile";
import { listMyRequestsDetailed, listRequestPhotos } from "@/lib/server/requests";

export const dynamic = "force-dynamic";

/**
 * GET                 → { requests }  my requests only (member_id = me), each with its job's live
 *                       status, rep first name, window, updates, door state, photo count, my rating.
 * GET ?photos=<id>    → { photos }    the rep's completion photos on one of my completed requests.
 */
export const GET = withAuth(APP_ROLE, async (request, user) => {
  const photosFor = new URL(request.url).searchParams.get("photos");
  if (photosFor) return json({ photos: await listRequestPhotos(user.id, photosFor.slice(0, 40)) });
  return json({ requests: await listMyRequestsDetailed(user.id) });
});

/**
 * Ask, Clutch, Overtime Rescue, Voice drop, Chat, Welcome cards and Life Admin all post here.
 * The member id, name and job title come from the session and profile, never the body.
 * The request lands in the Console queue (status "new").
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = newRequestSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const b = parsed.data;
  const r: StaffRequest = {
    id: newId("r"),
    memberId: user.id,
    member: `${user.firstName} ${user.lastName}`.trim(),
    role: await getJobTitle(user.id),
    cat: b.cat,
    text: b.text,
    ...(b.urgent ? { urgent: true } : {}),
    ...(b.window ? { window: b.window } : {}),
    source: b.source,
    createdAt: Date.now(),
    status: "new"
  };
  await createRequest(r);
  return json({ request: r }, 201);
});
