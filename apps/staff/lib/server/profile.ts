import "server-only";
import type { SignupInput } from "@hop/shared/server/auth";
import { json, sql } from "@hop/shared/server/db";
import { EARN_PERIOD, LEGACY_SAMPLE_PREFS, PREFS0, TAUGHT_KEY, findEarn, type Pref } from "../content";
import type { Consent, Profile } from "../types";

/*
 * Staff profile, points and consent queries (portal_staff_profiles, portal_point_claims).
 * Every function takes the signed-in user's id from the session; nothing here trusts the client.
 */

/** Earn periods are counted in the facility's local time. [CONFIRM per-facility time zones] */
export const TZ = "America/New_York";

/** sign-up hook: the unit must belong to the chosen facility, then the profile row is written. */
export async function createProfileOnSignup(userId: string, input: SignupInput): Promise<void> {
  const ok = (await sql()`SELECT 1 FROM portal_units WHERE id = ${input.unitId} AND facility_id = ${input.facilityId}`) as unknown[];
  if (!ok.length) throw json({ error: "Pick a unit in your facility." }, 400);
  await sql()`
    INSERT INTO portal_staff_profiles (user_id, job_title, unit_id, prefs)
    VALUES (${userId}, ${input.jobTitle}, ${input.unitId}, ${JSON.stringify(PREFS0)}::jsonb)
    ON CONFLICT (user_id) DO NOTHING
  `;
}

/** A staff user created some other way (or before Phase 4) gets an empty profile on first use. */
export async function ensureProfile(userId: string): Promise<void> {
  await sql()`INSERT INTO portal_staff_profiles (user_id, prefs) VALUES (${userId}, ${JSON.stringify(PREFS0)}::jsonb) ON CONFLICT (user_id) DO NOTHING`;
}

/** The current period id for each earn cadence, e.g. day "2026-10-14", week "2026-W42". */
export function currentPeriods(now = new Date()): { day: string; week: string; once: string } {
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
  // ISO week of that local date.
  const d = new Date(`${day}T00:00:00Z`);
  const dow = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dow);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { day, week: `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`, once: "once" };
}

type ProfileRow = {
  first_name: string;
  last_name: string;
  email: string;
  created_at: string;
  job_title: string | null;
  prefs: Pref[] | null;
  consents: Record<string, Consent> | null;
  points: number | null;
  lifetime_points: number | null;
  facility_name: string | null;
  unit_name: string | null;
};

export async function getProfile(userId: string): Promise<Profile> {
  await ensureProfile(userId);
  const p = currentPeriods();
  const [rowsRaw, claimsRaw] = await Promise.all([
    sql()`
      SELECT u.first_name, u.last_name, u.email, u.created_at, s.job_title, s.prefs, s.consents, s.points, s.lifetime_points,
             f.name AS facility_name, un.name AS unit_name
      FROM portal_users u
      LEFT JOIN portal_staff_profiles s ON s.user_id = u.id
      LEFT JOIN portal_facilities f ON f.id = u.facility_id
      LEFT JOIN portal_units un ON un.id = s.unit_id
      WHERE u.id = ${userId}
    `,
    sql()`SELECT earn_key, period FROM portal_point_claims WHERE user_id = ${userId} AND period IN (${p.day}, ${p.week}, ${p.once})`
  ]);
  const rows = rowsRaw as ProfileRow[];
  const claims = claimsRaw as { earn_key: string; period: string }[];
  const r = rows[0];
  if (!r) throw json({ error: "Not signed in" }, 401);
  const claimed = claims
    .filter((c) => {
      const e = findEarn(c.earn_key);
      return e && p[EARN_PERIOD[e.group]] === c.period;
    })
    .map((c) => c.earn_key);
  return {
    id: userId,
    firstName: r.first_name,
    lastName: r.last_name,
    email: r.email,
    jobTitle: r.job_title || "",
    facilityName: r.facility_name,
    unitName: r.unit_name,
    memberSince: new Date(r.created_at).toISOString(),
    // The prototype seeded sample prefs on sign-up; hide them unless the member confirmed one.
    prefs: Array.isArray(r.prefs) ? r.prefs.filter((x) => x.ok || !LEGACY_SAMPLE_PREFS.includes(x.v)) : [],
    consents: r.consents && typeof r.consents === "object" ? r.consents : {},
    points: r.points ?? 0,
    lifetimePoints: r.lifetime_points ?? 0,
    claimed
  };
}

export async function getJobTitle(userId: string): Promise<string> {
  const rows = (await sql()`SELECT job_title FROM portal_staff_profiles WHERE user_id = ${userId}`) as { job_title: string }[];
  return rows[0]?.job_title || "HOP member";
}

export async function savePrefs(userId: string, prefs: Pref[]): Promise<void> {
  await ensureProfile(userId);
  await sql()`UPDATE portal_staff_profiles SET prefs = ${JSON.stringify(prefs)}::jsonb, updated_at = NOW() WHERE user_id = ${userId}`;
}

/**
 * Claims an earn action once per period. The insert and the points update are one statement,
 * so two taps (or two devices) can't add the points twice.
 * TODO(IT): server-verify earn events (watch, shift system, CEU provider) before points have cash value.
 */
/**
 * Adds points for a server-checked action (games, social) once per (key, period), in one statement.
 * Returns the points added (0 if this key was already claimed for the period).
 */
export async function grantPoints(userId: string, key: string, period: string, points: number): Promise<number> {
  if (points <= 0) return 0;
  await ensureProfile(userId);
  const rows = (await sql()`
    WITH c AS (
      INSERT INTO portal_point_claims (user_id, earn_key, period, points)
      VALUES (${userId}, ${key}, ${period}, ${points})
      ON CONFLICT DO NOTHING
      RETURNING points
    )
    UPDATE portal_staff_profiles s
    SET points = s.points + c.points, lifetime_points = s.lifetime_points + c.points, updated_at = NOW()
    FROM c WHERE s.user_id = ${userId}
    RETURNING c.points
  `) as { points: number }[];
  return rows[0]?.points ?? 0;
}

export async function claimEarn(userId: string, earnKey: string): Promise<{ added: number }> {
  const earn = findEarn(earnKey);
  if (!earn) throw json({ error: "Unknown earn action" }, 400);
  await ensureProfile(userId);

  // The two earns the app can check for itself.
  if (earnKey === "connect" || earnKey === "profile") {
    const rows = (await sql()`SELECT prefs, consents FROM portal_staff_profiles WHERE user_id = ${userId}`) as { prefs: Pref[]; consents: Record<string, Consent> }[];
    const s = rows[0];
    if (earnKey === "connect" && !Object.entries(s?.consents || {}).some(([k, v]) => k.startsWith("wear:") && v?.granted)) {
      throw json({ error: "Connect a watch first." }, 400);
    }
    if (earnKey === "profile" && (s?.prefs || []).filter((x) => x.k === TAUGHT_KEY).length < 3) {
      throw json({ error: "Teach HOP three things first." }, 400);
    }
  }

  const period = currentPeriods()[EARN_PERIOD[earn.group]];
  const rows = (await sql()`
    WITH c AS (
      INSERT INTO portal_point_claims (user_id, earn_key, period, points)
      VALUES (${userId}, ${earnKey}, ${period}, ${earn.points})
      ON CONFLICT DO NOTHING
      RETURNING points
    )
    UPDATE portal_staff_profiles s
    SET points = s.points + c.points, lifetime_points = s.lifetime_points + c.points, updated_at = NOW()
    FROM c WHERE s.user_id = ${userId}
    RETURNING c.points
  `) as { points: number }[];
  return { added: rows[0]?.points ?? 0 };
}

/**
 * Records consent intent only. TODO(IT): no watch, calendar or schedule data is pulled until the
 * privacy/HIPAA review is done (docs/portal/architecture.md → Privacy rules).
 * One watch or health app at a time, as in the mockup.
 */
export async function recordConsent(userId: string, source: string, granted: boolean, scopes?: string[]): Promise<void> {
  await ensureProfile(userId);
  const rows = (await sql()`SELECT consents FROM portal_staff_profiles WHERE user_id = ${userId}`) as { consents: Record<string, Consent> }[];
  const consents: Record<string, Consent> = { ...(rows[0]?.consents || {}) };
  const at = new Date().toISOString();
  if (granted && source.startsWith("wear:")) {
    for (const k of Object.keys(consents)) if (k.startsWith("wear:") && k !== source && consents[k].granted) consents[k] = { ...consents[k], granted: false, at };
  }
  consents[source] = { granted, ...(scopes ? { scopes } : {}), at };
  await sql()`UPDATE portal_staff_profiles SET consents = ${JSON.stringify(consents)}::jsonb, updated_at = NOW() WHERE user_id = ${userId}`;
}
