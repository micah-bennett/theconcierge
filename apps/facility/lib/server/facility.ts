import "server-only";
import type { PortalUser, StaffRequest } from "@hop/shared/types";
import { sql } from "@hop/shared/server/db";
import { createRequest, getFacility, listUnits, newId } from "@hop/shared/server/store";
import {
  buildFacilityView,
  etDay,
  windowsFor,
  type AggRow,
  type CatRow,
  type FacilityViewData,
  type Metric,
  type Range,
  type SupportState
} from "./aggregate";

/*
 * Facility View data access. Every query here is scoped by the facility id the caller passes,
 * and the route handler only ever passes `user.facilityId` from the session.
 *
 * Signals come from portal_checkins (HOP Client daily check-ins and pulses) and portal_requests
 * (staff HOP requests, not the facility's own support items). portal_unit_signals is no longer
 * read. Every query returns counts, sums or distinct-people counts only: no user id, name,
 * check-in word or per-person value is ever selected.
 */

export interface LogEntry {
  at: string;
  text: string;
}

export type FacilityResponse = FacilityViewData & {
  facility: { name: string; city: string };
  log: LogEntry[];
  /** When the server built this response (ISO). The client refetches every 60 s. */
  updatedAt: string;
};

/**
 * Staff who turned "Share anonymized totals with my hospital" off are left out of every number.
 * Absent = included. The key matches PRIVACY in apps/staff/lib/content.ts (stored as `priv:<name>`).
 */
const SHARE_KEY = "priv:Share anonymized totals with my hospital";

export async function loadFacilityView(facilityId: string, metric: Metric, range: Range): Promise<FacilityResponse | null> {
  const facility = await getFacility(facilityId);
  if (!facility) return null;
  const units = await listUnits(facilityId);

  const today = etDay();
  const wins = windowsFor(today);
  const first = wins.reduce((a, w) => (w.from < a ? w.from : a), today);
  const week = wins.find((w) => w.key === "w7")!;

  // The one rollup over check-ins and requests, per window × unit × two-hour ET slot.
  // Data separation: only HOP Client staff of this organization count. Concierge Portal customers
  // (role 'customer') and instant requests (no account) are excluded twice over: by the staff-role
  // join and by portal_requests.channel = 'organization'. scripts/check-separation.mjs verifies it.
  // Mirrors rollup() in ./aggregate.ts; keep the two in step.
  const rows = (await sql()`
    WITH win AS (
      SELECT * FROM unnest(${wins.map((w) => w.key)}::text[], ${wins.map((w) => w.from)}::date[], ${wins.map((w) => w.to)}::date[]) AS w(key, d_from, d_to)
    ),
    ev AS (
      SELECT c.user_id, c.unit_id, c.day, EXTRACT(HOUR FROM c.at AT TIME ZONE 'America/New_York')::int AS h,
             TRUE AS is_checkin, c.source, c.mood::int AS mood, c.stress::int AS stress, c.took_break
      FROM portal_checkins c
      JOIN portal_units u ON u.id = c.unit_id
      JOIN portal_users cu ON cu.id = c.user_id AND cu.role = 'staff'
      LEFT JOIN portal_staff_profiles s ON s.user_id = c.user_id
      WHERE u.facility_id = ${facilityId} AND c.day BETWEEN ${first}::date AND ${today}::date
        AND COALESCE(s.consents->(${SHARE_KEY}::text)->>'granted', 'true') <> 'false'
      UNION ALL
      SELECT r.member_id, s.unit_id, (r.created_at AT TIME ZONE 'America/New_York')::date,
             EXTRACT(HOUR FROM r.created_at AT TIME ZONE 'America/New_York')::int,
             FALSE, NULL::text, NULL::int, NULL::int, NULL::boolean
      FROM portal_requests r
      JOIN portal_staff_profiles s ON s.user_id = r.member_id
      JOIN portal_users mu ON mu.id = r.member_id AND mu.role = 'staff'
      JOIN portal_units u ON u.id = s.unit_id
      WHERE u.facility_id = ${facilityId} AND r.status <> 'cancelled' AND r.channel = 'organization' AND COALESCE(r.data->>'source', '') <> 'facility'
        AND (r.created_at AT TIME ZONE 'America/New_York')::date BETWEEN ${first}::date AND ${today}::date
        AND COALESCE(s.consents->(${SHARE_KEY}::text)->>'granted', 'true') <> 'false'
    ),
    x AS (SELECT ev.*, CASE WHEN h < 6 THEN 22 ELSE LEAST(22, h - h % 2) END AS slot FROM ev)
    SELECT w.key AS win, x.unit_id, x.slot, GROUPING(x.unit_id) AS g_unit, GROUPING(x.slot) AS g_slot,
      COUNT(DISTINCT x.user_id)::int AS people,
      COUNT(DISTINCT x.user_id) FILTER (WHERE x.is_checkin)::int AS checkin_people,
      COUNT(*) FILTER (WHERE x.is_checkin)::int AS checkins,
      COALESCE(SUM(x.mood), 0)::float8 AS mood_sum, COUNT(x.mood)::int AS mood_n,
      COALESCE(SUM(x.stress), 0)::float8 AS stress_sum, COUNT(x.stress)::int AS stress_n,
      COUNT(*) FILTER (WHERE x.is_checkin AND x.source <> 'pulse' AND x.took_break IS NOT NULL)::int AS break_n,
      COUNT(*) FILTER (WHERE x.is_checkin AND x.source <> 'pulse' AND x.took_break = FALSE)::int AS missed_n,
      COUNT(*) FILTER (WHERE NOT x.is_checkin)::int AS requests
    FROM x JOIN win w ON x.day BETWEEN w.d_from AND w.d_to
    GROUP BY GROUPING SETS ((w.key, x.unit_id, x.slot), (w.key, x.unit_id), (w.key))
  `) as {
    win: string;
    unit_id: string | null;
    slot: number | null;
    g_unit: number;
    g_slot: number;
    people: number;
    checkin_people: number;
    checkins: number;
    mood_sum: number;
    mood_n: number;
    stress_sum: number;
    stress_n: number;
    break_n: number;
    missed_n: number;
    requests: number;
  }[];

  // Requests per unit and category, last 7 days (for "Top request").
  const cats = (await sql()`
    SELECT s.unit_id, COALESCE(r.data->>'cat', 'errand') AS cat, COUNT(*)::int AS n
    FROM portal_requests r
    JOIN portal_staff_profiles s ON s.user_id = r.member_id
    JOIN portal_users mu ON mu.id = r.member_id AND mu.role = 'staff'
    JOIN portal_units u ON u.id = s.unit_id
    WHERE u.facility_id = ${facilityId} AND r.status <> 'cancelled' AND r.channel = 'organization' AND COALESCE(r.data->>'source', '') <> 'facility'
      AND (r.created_at AT TIME ZONE 'America/New_York')::date BETWEEN ${week.from}::date AND ${today}::date
      AND COALESCE(s.consents->(${SHARE_KEY}::text)->>'granted', 'true') <> 'false'
    GROUP BY 1, 2
  `) as { unit_id: string; cat: string; n: number }[];

  // Requests HOP completed in the last 7 days, and how many distinct staff they came from (the floor).
  const handled = (await sql()`
    SELECT COUNT(*)::int AS n, COUNT(DISTINCT r.member_id)::int AS people
    FROM portal_requests r
    JOIN portal_staff_profiles s ON s.user_id = r.member_id
    JOIN portal_users mu ON mu.id = r.member_id AND mu.role = 'staff'
    JOIN portal_units u ON u.id = s.unit_id
    WHERE u.facility_id = ${facilityId} AND r.status = 'completed' AND r.channel = 'organization' AND COALESCE(r.data->>'source', '') <> 'facility'
      AND r.updated_at > NOW() - INTERVAL '7 days'
      AND COALESCE(s.consents->(${SHARE_KEY}::text)->>'granted', 'true') <> 'false'
  `) as { n: number; people: number }[];

  const sent = (await sql()`
    SELECT COUNT(*)::int AS n FROM portal_support_actions
    WHERE facility_id = ${facilityId} AND created_at > NOW() - INTERVAL '7 days'
  `) as { n: number }[];

  // Enrolled per unit: staff profiles on the unit whose account is active.
  const enrolled = (await sql()`
    SELECT p.unit_id, COUNT(*)::int AS n
    FROM portal_staff_profiles p JOIN portal_units u ON u.id = p.unit_id JOIN portal_users us ON us.id = p.user_id
    WHERE u.facility_id = ${facilityId} AND us.role = 'staff' AND us.status = 'active'
    GROUP BY p.unit_id
  `) as { unit_id: string; n: number }[];

  const support = (await sql()`
    SELECT DISTINCT ON (sa.unit_id) sa.unit_id, sa.status, sa.actions, sa.created_at, r.status AS request_status
    FROM portal_support_actions sa LEFT JOIN portal_requests r ON r.id = sa.request_id
    WHERE sa.facility_id = ${facilityId} AND sa.created_at > NOW() - INTERVAL '7 days'
    ORDER BY sa.unit_id, sa.created_at DESC
  `) as { unit_id: string; status: "sent" | "resolved"; actions: string[]; created_at: string; request_status: string | null }[];

  const logRows = (await sql()`
    SELECT sa.created_at, sa.actions, sa.status, u.name, r.status AS request_status
    FROM portal_support_actions sa JOIN portal_units u ON u.id = sa.unit_id
    LEFT JOIN portal_requests r ON r.id = sa.request_id
    WHERE sa.facility_id = ${facilityId}
    ORDER BY sa.created_at DESC LIMIT 12
  `) as { created_at: string; actions: string[]; status: string; name: string; request_status: string | null }[];

  const view = buildFacilityView({
    units: units.map((u) => ({ id: u.id, name: u.name })),
    today,
    rows: rows.map<AggRow>((r) => ({
      win: r.win,
      unitId: Number(r.g_unit) ? null : r.unit_id,
      slot: Number(r.g_slot) ? null : Number(r.slot),
      people: Number(r.people),
      checkinPeople: Number(r.checkin_people),
      checkins: Number(r.checkins),
      moodSum: Number(r.mood_sum),
      moodN: Number(r.mood_n),
      stressSum: Number(r.stress_sum),
      stressN: Number(r.stress_n),
      breakN: Number(r.break_n),
      missedN: Number(r.missed_n),
      requests: Number(r.requests)
    })),
    enrolled: Object.fromEntries(enrolled.map((e) => [e.unit_id, Number(e.n)])),
    cats: cats.map<CatRow>((c) => ({ unitId: c.unit_id, cat: c.cat, n: Number(c.n) })),
    handled: { n: Number(handled[0]?.n ?? 0), people: Number(handled[0]?.people ?? 0) },
    supportSent: Number(sent[0]?.n ?? 0),
    metric,
    range,
    support: Object.fromEntries(
      support.map<[string, SupportState]>((s) => [
        s.unit_id,
        { status: s.status, at: new Date(s.created_at).toISOString(), actions: s.actions, requestStatus: s.request_status }
      ])
    )
  });

  const progress = (status: string, req: string | null) =>
    status === "resolved" ? " · Resolved" : req === "completed" ? " · Done by HOP" : req === "dispatched" ? " · HOP concierge on it" : " · In the HOP queue";

  return {
    ...view,
    facility: { name: facility.name, city: facility.city },
    updatedAt: new Date().toISOString(),
    log: logRows.map((l) => ({
      at: new Date(l.created_at).toISOString(),
      text: `Support sent to ${l.name}: ${l.actions.join(", ")}${progress(l.status, l.request_status)}`
    }))
  };
}

/** The unit, only if it belongs to this facility. */
async function facilityUnit(facilityId: string, unitId: string) {
  const units = await listUnits(facilityId);
  return units.find((u) => u.id === unitId) ?? null;
}

/**
 * Records support for a unit and puts a unit-level item in the Console queue. The request text
 * names the unit and the chosen actions only (actions come from a fixed list), never a person.
 * Allowed for any unit of this facility, including units with no visible data.
 */
export async function sendSupport(user: PortalUser & { facilityId: string }, unitId: string, actions: string[]) {
  const facility = await getFacility(user.facilityId);
  const unit = await facilityUnit(user.facilityId, unitId);
  if (!facility || !unit) return { error: "That unit isn't part of your facility", status: 404 } as const;

  const open = (await sql()`
    SELECT 1 FROM portal_support_actions sa LEFT JOIN portal_requests r ON r.id = sa.request_id
    WHERE sa.facility_id = ${user.facilityId} AND sa.unit_id = ${unitId} AND sa.status = 'sent'
      AND sa.created_at > NOW() - INTERVAL '7 days' AND COALESCE(r.status, 'new') NOT IN ('completed', 'cancelled')
  `) as unknown[];
  if (open.length) return { error: `Support for ${unit.name} is already on its way`, status: 409 } as const;

  const request: StaffRequest = {
    id: newId("r"),
    memberId: user.id,
    member: facility.name,
    role: "Facility leader",
    cat: "errand",
    text: `Unit support for ${unit.name}: ${actions.join(", ")}`,
    window: "This week",
    source: "facility",
    createdAt: Date.now(),
    status: "new"
  };
  await createRequest(request);
  const rows = (await sql()`
    INSERT INTO portal_support_actions (facility_id, unit_id, actions, sent_by, status, request_id)
    VALUES (${user.facilityId}, ${unitId}, ${JSON.stringify(actions)}::jsonb, ${user.id}, 'sent', ${request.id})
    RETURNING id, created_at
  `) as { id: string; created_at: string }[];
  return { ok: true, id: rows[0]?.id, requestId: request.id, at: new Date(rows[0]?.created_at ?? Date.now()).toISOString() } as const;
}

/** Marks this facility's open support for a unit resolved. */
export async function resolveSupport(facilityId: string, unitId: string) {
  const rows = (await sql()`
    UPDATE portal_support_actions SET status = 'resolved'
    WHERE facility_id = ${facilityId} AND unit_id = ${unitId} AND status = 'sent'
    RETURNING id
  `) as unknown[];
  return rows.length;
}
