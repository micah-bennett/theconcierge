import { z } from "zod";
import { FLIGHT_REQUEST_TYPES, catForRequestType } from "@hop/shared/brand";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { createRequest, listMyRequests, newId } from "@hop/shared/server/store";
import type { StaffRequest } from "@hop/shared/types";
import { conciergeRequestSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";
import { fmtDate, todayYmd } from "@/lib/dates";
import { getProfile, updateProfile } from "@/lib/server/profile";
import { cancelMyRequest } from "@/lib/server/requests";

export const dynamic = "force-dynamic";

/** GET → { requests }  my requests only (member_id = me), newest first, with each job's live status and rep first name. */
export const GET = withAuth(APP_ROLE, async (_request, user) => json({ requests: await listMyRequests(user.id) }));

const postSchema = conciergeRequestSchema.extend({ saveAddress: z.boolean().optional() });

/**
 * POST              {conciergeRequestSchema + saveAddress?} → { request }  a new concierge request (status new).
 * POST ?action=cancel&id=<request id>                       → { ok }       cancel mine while it's still waiting.
 * Who is asking always comes from the session, never the body.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const url = new URL(request.url);
  if (url.searchParams.get("action") === "cancel") {
    const id = (url.searchParams.get("id") || "").slice(0, 40);
    if (!id) return json({ error: "Missing request id" }, 400);
    if (!(await cancelMyRequest(user.id, id))) {
      return json({ error: "This request can't be cancelled any more. It may already be with a rep. Message us and we'll help." }, 409);
    }
    return json({ ok: true });
  }

  const parsed = postSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const b = parsed.data;

  // "Today or later". Compared against the latest-running US time zone so a customer in Hawaii
  // late in the evening isn't told their today is in the past.
  if (b.dateNeeded < todayYmd("Pacific/Honolulu")) return json({ error: "Pick today or a later date." }, 400);
  if (b.dateNeeded > `${new Date().getUTCFullYear() + 2}-12-31`) return json({ error: "Pick a date within the next two years." }, 400);

  const profile = await getProfile(user);
  const hearAboutUs = b.hearAboutUs || profile.hearAboutUs;
  const flight = FLIGHT_REQUEST_TYPES.includes(b.requestType) ? b.flight : null;

  const r: StaffRequest = {
    id: newId("r"),
    memberId: user.id,
    member: `${profile.firstName} ${profile.lastName.charAt(0)}${profile.lastName ? "." : ""}`.trim(),
    role: "Concierge customer",
    cat: catForRequestType(b.requestType),
    text: b.text,
    ...(b.urgent ? { urgent: true } : {}),
    window: [fmtDate(b.dateNeeded), b.timeNeeded].filter(Boolean).join(" "),
    source: "concierge",
    createdAt: Date.now(),
    status: "new",
    // No `contact`: the Console reads the account's phone and email.
    details: {
      requestType: b.requestType,
      dateNeeded: b.dateNeeded,
      timeNeeded: b.timeNeeded,
      address: b.address,
      flight,
      payment: b.payment,
      hearAboutUs
    }
  };
  await createRequest(r);

  // Keep the profile's saved address and "how did you hear" up to date, when asked / when first given.
  const patch = {
    ...(b.saveAddress ? { address: b.address } : {}),
    ...(b.hearAboutUs && !profile.hearAboutUs ? { hearAboutUs: b.hearAboutUs } : {})
  };
  if (Object.keys(patch).length) await updateProfile(user.id, patch);

  return json({ request: r }, 201);
});
