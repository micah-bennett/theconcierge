import "server-only";
import { randomBytes } from "node:crypto";
import { MIN_GROUP_SIZE, STATUS_LABEL, appUrlFor } from "@hop/shared/brand";
import { json, sql } from "@hop/shared/server/db";
import { createRequest, newId, setDoorState } from "@hop/shared/server/store";
import type { JobStatus, PortalUser, StaffRequest } from "@hop/shared/types";
import { BLOG_URL, HIDE_LB_KEY, PULSE_WORDS, SHARE_TOTALS_KEY, SOCIAL_LABEL, SOCIAL_NETWORKS, SOCIAL_POINTS, findReward, type SocialNetwork } from "../content";
import type { Checkin, LeaderRow, LifeItem, MeState, Redemption, ShiftPattern } from "../types";
import { TZ, claimEarn, currentPeriods, ensureProfile, getJobTitle, grantPoints } from "./profile";

/*
 * Everything behind /api/me: check-ins, the pulse, shifts, life items, Coming soon interest,
 * rewards, ratings, door approval, referrals, social earns and the leaderboard.
 * Every function takes the signed-in user from the session. Nothing here trusts an id from the client
 * except as something to look up inside the user's own rows.
 */

/** Monday of the ET week that contains `day` ("YYYY-MM-DD"). */
export function weekStart(day: string): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

const addDays = (day: string, n: number) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Consecutive days with a check-in, ending today, or yesterday when today isn't in yet. */
export function streakFrom(days: Set<string>, today: string): number {
  let cur = days.has(today) ? today : addDays(today, -1);
  let n = 0;
  while (days.has(cur)) {
    n++;
    cur = addDays(cur, -1);
  }
  return n;
}

/** Points earned since the 1st of this month (ET). */
const monthStartSql = (day: string) => `${day.slice(0, 7)}-01`;

// ── Social links (SOCIAL_LINKS env, JSON) ───────────────────────────────────

/** The configured networks only. Bad JSON or non-https links count as not configured. */
export function socialLinks(): Partial<Record<SocialNetwork, string>> {
  try {
    const raw = JSON.parse(process.env.SOCIAL_LINKS || "{}") as Record<string, unknown>;
    const out: Partial<Record<SocialNetwork, string>> = {};
    for (const k of SOCIAL_NETWORKS) {
      const v = raw?.[k];
      if (typeof v === "string" && /^https:\/\/\S+$/.test(v.trim())) out[k] = v.trim();
    }
    return out;
  } catch {
    return {};
  }
}

// ── Referral code ────────────────────────────────────────────────────────────

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** The user's 8 character referral code, made on first need. */
export async function ensureReferralCode(userId: string): Promise<string> {
  await ensureProfile(userId);
  const cur = (await sql()`SELECT referral_code FROM portal_staff_profiles WHERE user_id = ${userId}`) as { referral_code: string | null }[];
  if (cur[0]?.referral_code) return cur[0].referral_code;
  for (let attempt = 0; attempt < 5; attempt++) {
    const bytes = randomBytes(8);
    const code = Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
    try {
      const rows = (await sql()`
        UPDATE portal_staff_profiles SET referral_code = COALESCE(referral_code, ${code}), updated_at = NOW()
        WHERE user_id = ${userId} RETURNING referral_code
      `) as { referral_code: string }[];
      if (rows[0]?.referral_code) return rows[0].referral_code;
    } catch {
      // Unique index clash: try another code.
    }
  }
  throw json({ error: "Couldn't make your invite code. Try again." }, 500);
}

function inviteUrl(code: string): string {
  const base = (appUrlFor("staff") || process.env.APP_URL || "").replace(/\/+$/, "");
  return `${base}/signup?ref=${code}`;
}

/**
 * Sets referred_by once, right after sign-up: only if it's empty, the code isn't the user's own,
 * and the account is under a day old. The referrer gets the one-time "refer" earn.
 */
export async function setReferredBy(user: PortalUser, code: string): Promise<{ ok: boolean }> {
  const rows = (await sql()`
    UPDATE portal_staff_profiles s SET referred_by = r.user_id, updated_at = NOW()
    FROM portal_staff_profiles r, portal_users u
    WHERE s.user_id = ${user.id} AND s.referred_by IS NULL
      AND r.referral_code = ${code.toUpperCase()} AND r.user_id <> ${user.id}
      AND u.id = ${user.id} AND u.created_at > NOW() - INTERVAL '1 day'
    RETURNING r.user_id AS referrer
  `) as { referrer: string }[];
  const referrer = rows[0]?.referrer;
  if (!referrer) return { ok: false };
  await claimEarn(referrer, "refer").catch(() => {});
  return { ok: true };
}

// ── Check-ins and pulse ──────────────────────────────────────────────────────

export async function saveCheckin(
  userId: string,
  c: { mood: number; stress: number; tookBreak: boolean; word: string }
): Promise<{ checkin: Checkin; added: number; streak: number }> {
  await ensureProfile(userId);
  const { day } = currentPeriods();
  // One per ET day; a second answer the same day edits it.
  await sql()`
    INSERT INTO portal_checkins (user_id, unit_id, source, mood, stress, took_break, word, day)
    SELECT ${userId}, s.unit_id, 'daily', ${c.mood}, ${c.stress}, ${c.tookBreak}, ${c.word}, ${day}::date
    FROM portal_staff_profiles s WHERE s.user_id = ${userId}
    ON CONFLICT (user_id, source, day) DO UPDATE
      SET mood = EXCLUDED.mood, stress = EXCLUDED.stress, took_break = EXCLUDED.took_break, word = EXCLUDED.word,
          unit_id = EXCLUDED.unit_id, at = NOW()
  `;
  let added = (await claimEarn(userId, "check")).added;
  const days = (await sql()`
    SELECT day::text AS day FROM portal_checkins WHERE user_id = ${userId} AND source = 'daily' ORDER BY day DESC LIMIT 400
  `) as { day: string }[];
  const streak = streakFrom(new Set(days.map((d) => d.day)), day);
  if (streak >= 7) added += (await claimEarn(userId, "streak")).added;
  return { checkin: { day, ...c }, added, streak };
}

/** The weekly pulse is stored once per ET week (day = that week's Monday). */
export async function savePulse(userId: string, p: { supported: number; word: string }): Promise<{ added: number }> {
  await ensureProfile(userId);
  const week = weekStart(currentPeriods().day);
  await sql()`
    INSERT INTO portal_checkins (user_id, unit_id, source, supported, word, day)
    SELECT ${userId}, s.unit_id, 'pulse', ${p.supported}, ${p.word}, ${week}::date
    FROM portal_staff_profiles s WHERE s.user_id = ${userId}
    ON CONFLICT (user_id, source, day) DO UPDATE SET supported = EXCLUDED.supported, word = EXCLUDED.word, unit_id = EXCLUDED.unit_id, at = NOW()
  `;
  return claimEarn(userId, "pulse");
}

// ── Shift pattern, life items, interest ─────────────────────────────────────

export async function saveShift(userId: string, shift: ShiftPattern | null): Promise<void> {
  await ensureProfile(userId);
  await sql()`UPDATE portal_staff_profiles SET shift_pattern = ${shift ? JSON.stringify(shift) : null}::jsonb, updated_at = NOW() WHERE user_id = ${userId}`;
}

export async function addLifeItem(userId: string, title: string, dueOn: string | null): Promise<void> {
  const n = (await sql()`SELECT count(*)::int AS n FROM portal_life_items WHERE user_id = ${userId}`) as { n: number }[];
  if ((n[0]?.n ?? 0) >= 60) throw json({ error: "That's a lot on your list. Clear a few done ones first." }, 400);
  await sql()`INSERT INTO portal_life_items (user_id, title, due_on) VALUES (${userId}, ${title}, ${dueOn}::date)`;
}

export async function setLifeDone(userId: string, id: number, done: boolean): Promise<void> {
  const rows = (await sql()`UPDATE portal_life_items SET done = ${done} WHERE id = ${id} AND user_id = ${userId} RETURNING id`) as unknown[];
  if (!rows.length) throw json({ error: "Item not found" }, 404);
}

export async function deleteLifeItem(userId: string, id: number): Promise<void> {
  await sql()`DELETE FROM portal_life_items WHERE id = ${id} AND user_id = ${userId}`;
}

export async function addInterest(userId: string, feature: string): Promise<void> {
  await sql()`INSERT INTO portal_interest (user_id, feature_key) VALUES (${userId}, ${feature}) ON CONFLICT DO NOTHING`;
}

// ── Rewards ──────────────────────────────────────────────────────────────────

/**
 * Spends points on a reward. The balance check, the deduction and the redemption row are one
 * statement, so two taps can't overspend. Then a Console request (source "reward") is created.
 */
export async function redeem(user: PortalUser, rewardKey: string): Promise<{ redemptionId: string; requestId: string; points: number }> {
  const reward = findReward(rewardKey);
  if (!reward) throw json({ error: "Unknown reward" }, 400);
  await ensureProfile(user.id);
  const redemptionId = newId("x");
  const requestId = newId("r");
  const rows = (await sql()`
    WITH d AS (
      UPDATE portal_staff_profiles SET points = points - ${reward.cost}, updated_at = NOW()
      WHERE user_id = ${user.id} AND points >= ${reward.cost}
      RETURNING points
    ), x AS (
      INSERT INTO portal_redemptions (id, user_id, reward_key, points, request_id)
      SELECT ${redemptionId}, ${user.id}, ${reward.key}, ${reward.cost}, ${requestId} FROM d
      RETURNING id
    )
    SELECT (SELECT points FROM d) AS balance, (SELECT id FROM x) AS id
  `) as { balance: number | null; id: string | null }[];
  if (!rows[0]?.id) throw json({ error: "Not enough points for this one yet." }, 409);
  const r: StaffRequest = {
    id: requestId,
    memberId: user.id,
    member: `${user.firstName} ${user.lastName}`.trim(),
    role: await getJobTitle(user.id),
    cat: reward.cat,
    text: `Reward: ${reward.name} (${reward.cost.toLocaleString("en-US")} points)`,
    source: "reward",
    createdAt: Date.now(),
    status: "new"
  };
  try {
    await createRequest(r);
  } catch (e) {
    // Put the points back if the Console request couldn't be made.
    await sql()`
      WITH x AS (DELETE FROM portal_redemptions WHERE id = ${redemptionId} AND user_id = ${user.id} RETURNING points)
      UPDATE portal_staff_profiles s SET points = s.points + x.points FROM x WHERE s.user_id = ${user.id}
    `;
    throw e;
  }
  return { redemptionId, requestId, points: rows[0].balance ?? 0 };
}

// ── Ratings and door approval ────────────────────────────────────────────────

export async function rateRequest(userId: string, requestId: string, stars: number, note: string): Promise<{ added: number }> {
  const rows = (await sql()`
    INSERT INTO portal_ratings (request_id, job_id, rep_id, member_id, stars, note)
    SELECT r.id, j.id, j.rep_id, r.member_id, ${stars}, ${note}
    FROM portal_requests r JOIN portal_jobs j ON j.id = r.job_id
    WHERE r.id = ${requestId} AND r.member_id = ${userId} AND j.status = 'completed'
    ON CONFLICT (request_id) DO NOTHING
    RETURNING request_id
  `) as unknown[];
  if (!rows.length) {
    const mine = (await sql()`
      SELECT j.status FROM portal_requests r LEFT JOIN portal_jobs j ON j.id = r.job_id WHERE r.id = ${requestId} AND r.member_id = ${userId}
    `) as { status: string | null }[];
    if (!mine.length) throw json({ error: "Request not found" }, 404);
    if (mine[0].status !== "completed") throw json({ error: "You can rate this once it's completed." }, 409);
    throw json({ error: "You already rated this one. Thank you." }, 409);
  }
  return claimEarn(userId, "rate");
}

export async function answerDoor(user: PortalUser, jobId: string, approve: boolean) {
  const res = await setDoorState(jobId, approve ? "ok" : "denied", { id: user.id, role: "staff", name: `${user.firstName} ${user.lastName.slice(0, 1)}.`.trim() });
  if ("error" in res) throw json({ error: res.error }, res.status);
  return { doorState: res.job.door?.state ?? null };
}

// ── Social earns ─────────────────────────────────────────────────────────────

export async function claimSocial(userId: string, kind: "follow" | "blog" | "share", network?: string): Promise<{ added: number }> {
  const p = currentPeriods();
  if (kind === "follow") {
    const links = socialLinks();
    if (!network || !(network in links)) throw json({ error: "That network isn't set up yet." }, 400);
    return { added: await grantPoints(userId, `social:follow:${network}`, p.once, SOCIAL_POINTS.follow) };
  }
  if (kind === "blog") return { added: await grantPoints(userId, "social:blog", p.day, SOCIAL_POINTS.blog) };
  return { added: await grantPoints(userId, "social:share", p.week, SOCIAL_POINTS.share) };
}

// ── Everything for the screens ──────────────────────────────────────────────

const reqStatusWord = (status: string | null, job: JobStatus | null) => {
  if (status === "cancelled") return "Cancelled";
  if (job === "declined") return "Received";
  if (job) return STATUS_LABEL[job] ?? "Received";
  if (status === "completed") return "Completed";
  return "Received";
};

export async function getMeState(user: PortalUser): Promise<MeState> {
  await ensureProfile(user.id);
  const p = currentPeriods();
  const day = p.day;
  const week = weekStart(day);
  const from14 = addDays(day, -13);
  const monthStart = monthStartSql(day);
  const code = await ensureReferralCode(user.id);

  const [profRaw, checkRaw, pulseMineRaw, pulseAggRaw, lifeRaw, redRaw, intRaw, playRaw, refRaw, socialRaw, lbRaw] = await Promise.all([
    sql()`SELECT unit_id, shift_pattern, consents FROM portal_staff_profiles WHERE user_id = ${user.id}`,
    sql()`
      SELECT day::text AS day, mood, stress, took_break, word FROM portal_checkins
      WHERE user_id = ${user.id} AND source = 'daily' ORDER BY day DESC LIMIT 400
    `,
    sql()`SELECT supported, word FROM portal_checkins WHERE user_id = ${user.id} AND source = 'pulse' AND day = ${week}::date`,
    // My unit's pulse this week, from people who share totals. Shown only at MIN_GROUP_SIZE or more.
    sql()`
      SELECT c.supported, c.word, c.user_id FROM portal_checkins c
      JOIN portal_staff_profiles s ON s.user_id = c.user_id
      WHERE c.source = 'pulse' AND c.day = ${week}::date
        AND c.unit_id = (SELECT unit_id FROM portal_staff_profiles WHERE user_id = ${user.id})
        AND COALESCE(s.consents->${SHARE_TOTALS_KEY}::text->>'granted', 'true') <> 'false'
    `,
    sql()`SELECT id, title, due_on::text AS due_on, done FROM portal_life_items WHERE user_id = ${user.id} ORDER BY done, due_on NULLS LAST, created_at DESC LIMIT 60`,
    sql()`
      SELECT x.id, x.reward_key, x.points, x.at, x.request_id, r.status AS req_status, j.status AS job_status
      FROM portal_redemptions x
      LEFT JOIN portal_requests r ON r.id = x.request_id
      LEFT JOIN portal_jobs j ON j.id = r.job_id
      WHERE x.user_id = ${user.id} ORDER BY x.at DESC LIMIT 20
    `,
    sql()`SELECT feature_key FROM portal_interest WHERE user_id = ${user.id}`,
    sql()`SELECT count(DISTINCT period)::int AS n FROM portal_game_plays WHERE user_id = ${user.id} AND period >= ${week} AND period <= ${day}`,
    sql()`SELECT count(*)::int AS n FROM portal_staff_profiles WHERE referred_by = ${user.id}`,
    sql()`
      SELECT earn_key, period FROM portal_point_claims
      WHERE user_id = ${user.id} AND earn_key LIKE 'social:%' AND period IN (${p.day}, ${p.week}, ${p.once})
    `,
    // Staff at my facility, points earned this month, minus anyone who hid themselves.
    sql()`
      WITH pts AS (
        SELECT user_id, SUM(points)::int AS pts FROM portal_point_claims
        WHERE claimed_at >= (${monthStart}::date::timestamp AT TIME ZONE ${TZ})
        GROUP BY user_id
      ), staff AS (
        SELECT u.id, u.first_name, u.last_name, un.name AS unit, COALESCE(pts.pts, 0) AS pts,
               COALESCE(s.consents->${HIDE_LB_KEY}::text->>'granted', 'false') = 'true' AS hidden
        FROM portal_users u
        JOIN portal_staff_profiles s ON s.user_id = u.id
        LEFT JOIN portal_units un ON un.id = s.unit_id
        LEFT JOIN pts ON pts.user_id = u.id
        WHERE u.role = 'staff' AND u.status = 'active'
          AND (u.id = ${user.id} OR u.facility_id = (SELECT facility_id FROM portal_users WHERE id = ${user.id}))
      ), ranked AS (
        SELECT *, RANK() OVER (ORDER BY pts DESC) AS rk FROM staff WHERE NOT hidden AND pts > 0
      )
      SELECT first_name, last_name, unit, pts, rk::int AS rk, (id = ${user.id}) AS me FROM ranked
      WHERE rk <= 10 OR id = ${user.id}
      ORDER BY rk, first_name LIMIT 11
    `
  ]);

  const prof = (profRaw as { unit_id: string | null; shift_pattern: ShiftPattern | null; consents: Record<string, { granted: boolean }> | null }[])[0];
  const checks = (checkRaw as { day: string; mood: number; stress: number; took_break: boolean; word: string }[]).map(
    (c): Checkin => ({ day: c.day, mood: Number(c.mood), stress: Number(c.stress), tookBreak: !!c.took_break, word: c.word || "" })
  );
  const today = checks.find((c) => c.day === day) ?? null;
  const streak = streakFrom(new Set(checks.map((c) => c.day)), day);
  const history = checks.filter((c) => c.day >= from14).reverse();
  const checkinDays = checks.filter((c) => c.day >= week && c.day <= day).length;

  const pulseMine = (pulseMineRaw as { supported: number; word: string }[])[0];
  const agg = pulseAggRaw as { supported: number | null; word: string; user_id: string }[];
  const respondents = new Set(agg.map((a) => a.user_id)).size;
  let results: MeState["pulse"]["results"] = null;
  if (respondents >= MIN_GROUP_SIZE) {
    const sup = agg.map((a) => Number(a.supported)).filter((v) => v >= 1);
    const words = new Map<string, number>();
    for (const a of agg) if (PULSE_WORDS.includes(a.word)) words.set(a.word, (words.get(a.word) ?? 0) + 1);
    results = {
      avgSupported: sup.length ? Math.round((sup.reduce((s, v) => s + v, 0) / sup.length) * 10) / 10 : 0,
      supportedPct: sup.length ? Math.round((sup.filter((v) => v >= 4).length / sup.length) * 100) : 0,
      words: [...words.entries()].sort((a, b) => b[1] - a[1])
    };
  }

  const life = (lifeRaw as { id: number | string; title: string; due_on: string | null; done: boolean }[]).map(
    (l): LifeItem => ({ id: Number(l.id), title: l.title, dueOn: l.due_on, done: !!l.done })
  );
  const redemptions = (
    redRaw as { id: string; reward_key: string; points: number; at: string; request_id: string | null; req_status: string | null; job_status: JobStatus | null }[]
  ).map(
    (x): Redemption => ({
      id: x.id,
      rewardKey: x.reward_key,
      name: findReward(x.reward_key)?.name ?? x.reward_key,
      points: Number(x.points),
      at: new Date(x.at).toISOString(),
      requestId: x.request_id,
      status: reqStatusWord(x.req_status, x.job_status)
    })
  );

  const links = socialLinks();
  const socialClaimed = (socialRaw as { earn_key: string; period: string }[])
    .filter((c) => (c.earn_key === "social:blog" ? c.period === p.day : c.earn_key === "social:share" ? c.period === p.week : c.period === p.once))
    .map((c) => c.earn_key);

  const lb = lbRaw as { first_name: string; last_name: string; unit: string | null; pts: number; rk: number; me: boolean }[];
  const rows: LeaderRow[] = lb
    .filter((r) => r.rk <= 10)
    .map((r) => ({ rank: r.rk, name: `${r.first_name} ${(r.last_name || "").slice(0, 1)}.`.trim(), unit: r.unit, points: Number(r.pts), me: !!r.me }));
  const mine = lb.find((r) => r.me);
  const myPointsRaw = (await sql()`
    SELECT COALESCE(SUM(points), 0)::int AS n FROM portal_point_claims
    WHERE user_id = ${user.id} AND claimed_at >= (${monthStart}::date::timestamp AT TIME ZONE ${TZ})
  `) as { n: number }[];

  return {
    day,
    checkin: today,
    streak,
    history,
    pulse: { mine: pulseMine ? { supported: Number(pulseMine.supported), word: pulseMine.word } : null, respondents, results },
    shift: prof?.shift_pattern ?? null,
    life,
    redemptions,
    interest: (intRaw as { feature_key: string }[]).map((r) => r.feature_key),
    challenges: { checkinDays, playDays: (playRaw as { n: number }[])[0]?.n ?? 0, pulseDone: !!pulseMine },
    referral: { code, joined: (refRaw as { n: number }[])[0]?.n ?? 0, url: inviteUrl(code) },
    social: {
      networks: SOCIAL_NETWORKS.filter((k) => links[k]).map((k) => ({ key: k, label: SOCIAL_LABEL[k], url: links[k]! })),
      blog: BLOG_URL,
      claimed: socialClaimed
    },
    leaderboard: {
      rows,
      myPoints: myPointsRaw[0]?.n ?? 0,
      myRank: mine ? mine.rk : null,
      hidden: prof?.consents?.[HIDE_LB_KEY]?.granted === true
    }
  };
}

