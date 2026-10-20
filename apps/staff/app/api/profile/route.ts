import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { APP_ROLE } from "@/lib/app";
import { CONSENT_KEY, SERVER_EARNS } from "@/lib/content";
import { claimEarn, getProfile, recordConsent, savePrefs } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

const clean = (max: number) => z.string().trim().max(max).transform((s) => s.replace(/[<>`]/g, ""));

const prefSchema = z.object({
  i: clean(8),
  k: clean(60).pipe(z.string().min(1)),
  v: clean(300).pipe(z.string().min(1)),
  src: clean(80),
  conf: z.number().int().min(0).max(100),
  ok: z.boolean()
});

/** Exactly one of prefs, claim or consent per PATCH. */
const patchSchema = z.union([
  z.object({ prefs: z.array(prefSchema).max(40) }).strict(),
  z.object({ claim: z.string().max(40) }).strict(),
  z.object({
    consent: z
      .object({
        source: z.string().max(70).regex(CONSENT_KEY, "Unknown consent"),
        granted: z.boolean(),
        scopes: z.array(clean(60)).max(8).optional()
      })
      .strict()
  }).strict()
]);

/** My profile: name, job title, facility, unit, member since, prefs, consents, points, claimed earns. */
export const GET = withAuth(APP_ROLE, async (_request, user) => {
  return json({ profile: await getProfile(user.id) });
});

export const PATCH = withAuth(APP_ROLE, async (request, user) => {
  const parsed = patchSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const body = parsed.data;
  let added: number | undefined;
  if ("prefs" in body) await savePrefs(user.id, body.prefs);
  if ("claim" in body) {
    // Check-ins, the pulse, ratings, streaks and referrals are granted when they happen (/api/me).
    if (SERVER_EARNS.includes(body.claim)) return json({ error: "HOP adds these points for you when it happens." }, 400);
    added = (await claimEarn(user.id, body.claim)).added;
  }
  if ("consent" in body) await recordConsent(user.id, body.consent.source, body.consent.granted, body.consent.scopes);
  return json({ profile: await getProfile(user.id), ...(added !== undefined ? { added } : {}) });
});
