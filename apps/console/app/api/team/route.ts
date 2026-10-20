import { z } from "zod";
import { APP_FOR_ROLE } from "@hop/shared/brand";
import { createPasswordToken, withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { sendInviteEmail } from "@hop/shared/server/email";
import { createInvitedUser, getFacility, getUser, listFacilities, listUsers, setUserStatus } from "@hop/shared/server/store";
import type { PortalUser, Role } from "@hop/shared/types";
import { inviteSchema } from "@hop/shared/validate";
import { APP_ROLE } from "@/lib/app";
import { enableUser, repAvailability, repRatings, voidInviteTokens } from "@/lib/server/queries";

export const dynamic = "force-dynamic";

type TeamRole = Exclude<Role, "staff">;
const TEAM_ROLES: TeamRole[] = ["console", "rep", "facility_admin"];

/** Local dev defaults (docs/portal/architecture.md → dev ports) when an *_URL isn't set. */
const DEV_URL: Record<TeamRole, string> = { console: "http://localhost:3002", rep: "http://localhost:3003", facility_admin: "http://localhost:3004" };

/** Base URL of the app a role signs in to. Invite links must land on *that* app's /set-password. */
function appBase(role: TeamRole, request: Request): string | null {
  const env = role === "rep" ? process.env.REP_URL : role === "facility_admin" ? process.env.FACILITY_URL : process.env.APP_URL || process.env.CONSOLE_URL;
  const url = env?.trim() || (role === "console" ? new URL(request.url).origin : process.env.NODE_ENV !== "production" ? DEV_URL[role] : "");
  return url ? url.replace(/\/+$/, "") : null;
}

/** Creates a fresh invite token and emails it. Returns whether the email went out (dev logs the link instead). */
async function sendInvite(user: PortalUser, base: string): Promise<boolean> {
  const token = await createPasswordToken(user.id, "invite");
  const link = `${base}/set-password?token=${token}`;
  try {
    await sendInviteEmail(user.email, user.firstName, APP_FOR_ROLE[user.role].name, link);
    return true;
  } catch (e) {
    console.error("[team] invite email failed", e);
    return false;
  }
}

/**
 * GET /api/team → every non-staff user (console, rep, facility_admin) plus facilities for the invite picker.
 * Reps also carry `availability` ("online" | "offline"), `rating` (average stars, null with none) and `ratings` (count).
 */
export const GET = withAuth(APP_ROLE, async () => {
  const [list, facilities, avail, ratings] = await Promise.all([listUsers({ roles: TEAM_ROLES }), listFacilities(), repAvailability(), repRatings()]);
  const users = list.map((u) =>
    u.role === "rep" ? { ...u, availability: avail.get(u.id) ?? "offline", rating: ratings.get(u.id)?.rating ?? null, ratings: ratings.get(u.id)?.ratings ?? 0 } : u
  );
  return json({ users, facilities });
});

/** POST /api/team → invite a rep, console user or facility admin. Creates them as invited (no password) and emails a set-password link. */
export const POST = withAuth(APP_ROLE, async (request) => {
  const parsed = inviteSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const input = parsed.data;

  const facilityId = input.role === "facility_admin" ? input.facilityId : null;
  if (facilityId && !(await getFacility(facilityId))) return json({ error: "That facility doesn't exist." }, 400);

  const base = appBase(input.role, request);
  if (!base) return json({ error: `${APP_FOR_ROLE[input.role].envKey} is not configured, so the invite link can't be built.` }, 500);

  const user = await createInvitedUser({ ...input, facilityId });
  if (!user) return json({ error: "An account with this email already exists." }, 409);
  const emailed = await sendInvite(user, base);
  return json({ user, emailed }, 201);
});

const patchSchema = z.object({ action: z.enum(["disable", "enable", "resend-invite"]) }).strict();

/** PATCH /api/team?id=… → { action: "disable" | "enable" | "resend-invite" } on a non-staff user. */
export const PATCH = withAuth(APP_ROLE, async (request, me) => {
  const id = new URL(request.url).searchParams.get("id") || "";
  if (!z.string().uuid().safeParse(id).success) return json({ error: "Missing user id" }, 400);
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const { action } = parsed.data;

  const target = await getUser(id);
  if (!target || target.role === "staff") return json({ error: "User not found" }, 404);
  const role = target.role as TeamRole;

  if (action === "disable") {
    if (target.id === me.id) return json({ error: "You can't turn off your own account." }, 400);
    await setUserStatus(target.id, "disabled"); // also ends their sessions
    await voidInviteTokens(target.id);
    return json({ ok: true, user: await getUser(target.id) });
  }

  if (action === "enable") {
    if (target.status !== "disabled") return json({ error: "This account is already on." }, 409);
    await enableUser(target.id);
    return json({ ok: true, user: await getUser(target.id) });
  }

  // resend-invite
  if (target.status !== "invited") {
    return json({ error: target.status === "active" ? "They already set a password. They can use Forgot password." : "Turn this account on first." }, 409);
  }
  const base = appBase(role, request);
  if (!base) return json({ error: `${APP_FOR_ROLE[role].envKey} is not configured, so the invite link can't be built.` }, 500);
  await voidInviteTokens(target.id);
  const emailed = await sendInvite(target, base);
  return json({ ok: true, emailed, user: target });
});
