import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { APP_ROLE } from "@/lib/app";
import { getProfile, profilePatchSchema, updateProfile } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

/** GET → { profile }  my name, email, phone, saved address and how I heard about HOP. */
export const GET = withAuth(APP_ROLE, async (_request, user) => json({ profile: await getProfile(user) }));

/** PUT {firstName?, lastName?, phone?, address?, hearAboutUs?} → { profile }. Always my own account. */
export const PUT = withAuth(APP_ROLE, async (request, user) => {
  const parsed = profilePatchSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  await updateProfile(user.id, parsed.data);
  return json({ profile: await getProfile(user) });
});
