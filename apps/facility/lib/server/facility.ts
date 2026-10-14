import "server-only";
import type { PortalUser, StaffRequest } from "@hop/shared/types";
import { sql } from "@hop/shared/server/db";
import { createRequest, getFacility, listUnits, newId } from "@hop/shared/server/store";
import { buildFacilityView, type FacilityViewData, type Metric, type Range, type SignalRow, type SupportState } from "./aggregate";

/*
 * Facility View data access. Every query here is scoped by the facility id the caller passes,
 * and the route handler only ever passes `user.facilityId` from the session.
 */

export interface LogEntry {
  at: string;
  text: string;
}

export type FacilityResponse = FacilityViewData & {
  facility: { name: string; city: string };
  log: LogEntry[];
};

export async function loadFacilityView(facilityId: string, metric: Metric, range: Range): Promise<FacilityResponse | null> {
  const facility = await getFacility(facilityId);
  if (!facility) return null;
  const units = await listUnits(facilityId);

  // 14 days of signals for this facility's units, anchored on the latest day that has any.
  const signals = (await sql()`
    WITH f AS (
      SELECT s.* FROM portal_unit_signals s JOIN portal_units u ON u.id = s.unit_id WHERE u.facility_id = ${facilityId}
    )
    SELECT unit_id, to_char(day, 'YYYY-MM-DD') AS day, metric, hour, value::float8 AS value, group_size
    FROM f WHERE day > (SELECT MAX(day) FROM f) - 14
  `) as { unit_id: string; day: string; metric: string; hour: number | null; value: number; group_size: number }[];

  const support = (await sql()`
    SELECT DISTINCT ON (sa.unit_id) sa.unit_id, sa.status, sa.actions, sa.created_at, r.status AS request_status
    FROM portal_support_actions sa LEFT JOIN portal_requests r ON r.id = sa.request_id
    WHERE sa.facility_id = ${facilityId} AND sa.created_at > NOW() - INTERVAL '7 days'
    ORDER BY sa.unit_id, sa.created_at DESC
  `) as { unit_id: string; status: "sent" | "resolved"; actions: string[]; created_at: string; request_status: string | null }[];

  // Live HOP requests per unit (counts only), and how many staff are enrolled in each unit:
  // a unit with fewer than MIN_GROUP_SIZE enrolled staff has its count suppressed.
  const enrolled = (await sql()`
    SELECT p.unit_id, COUNT(*)::int AS n
    FROM portal_staff_profiles p JOIN portal_units u ON u.id = p.unit_id JOIN portal_users us ON us.id = p.user_id
    WHERE u.facility_id = ${facilityId} AND us.role = 'staff' AND us.status <> 'disabled'
    GROUP BY p.unit_id
  `) as { unit_id: string; n: number }[];
  const counts = (await sql()`
    SELECT p.unit_id, COUNT(r.id)::int AS n
    FROM portal_requests r
    JOIN portal_users us ON us.id = r.member_id AND us.role = 'staff'
    JOIN portal_staff_profiles p ON p.user_id = r.member_id
    JOIN portal_units u ON u.id = p.unit_id
    WHERE u.facility_id = ${facilityId} AND r.created_at > NOW() - INTERVAL '7 days' AND r.status <> 'cancelled'
    GROUP BY p.unit_id
  `) as { unit_id: string; n: number }[];

  const logRows = (await sql()`
    SELECT sa.created_at, sa.actions, sa.status, u.name, r.status AS request_status
    FROM portal_support_actions sa JOIN portal_units u ON u.id = sa.unit_id
    LEFT JOIN portal_requests r ON r.id = sa.request_id
    WHERE sa.facility_id = ${facilityId}
    ORDER BY sa.created_at DESC LIMIT 12
  `) as { created_at: string; actions: string[]; status: string; name: string; request_status: string | null }[];

  const live: Record<string, { count: number; enrolled: number }> = {};
  for (const e of enrolled) live[e.unit_id] = { count: 0, enrolled: e.n };
  for (const c of counts) live[c.unit_id] = { count: c.n, enrolled: live[c.unit_id]?.enrolled ?? 0 };

  const view = buildFacilityView({
    units: units.map((u) => ({ id: u.id, name: u.name })),
    signals: signals.map<SignalRow>((s) => ({
      unitId: s.unit_id,
      day: s.day,
      metric: s.metric,
      hour: s.hour === null ? null : Number(s.hour),
      value: Number(s.value),
      groupSize: Number(s.group_size)
    })),
    metric,
    range,
    support: Object.fromEntries(
      support.map<[string, SupportState]>((s) => [
        s.unit_id,
        { status: s.status, at: new Date(s.created_at).toISOString(), actions: s.actions, requestStatus: s.request_status }
      ])
    ),
    liveRequests: live
  });

  const progress = (status: string, req: string | null) =>
    status === "resolved" ? " · Resolved" : req === "completed" ? " · Done by HOP" : req === "dispatched" ? " · HOP concierge on it" : " · In the HOP queue";

  return {
    ...view,
    facility: { name: facility.name, city: facility.city },
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
