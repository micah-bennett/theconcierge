// Asserts the Facility View privacy floor over synthetic check-ins and requests. Run from the repo root:
//   node --experimental-strip-types apps/facility/scripts/check-suppression.mts
// (Node 23.6+ strips types by default, so plain `node apps/facility/scripts/check-suppression.mts` works too.)
//
// The synthetic people go through rollup() (the reference for the SQL in lib/server/facility.ts)
// and then buildFacilityView(), exactly as the route does with the SQL's rows.
import assert from "node:assert/strict";
import { MIN_GROUP_SIZE } from "@hop/shared/brand";
import { buildFacilityView, METRICS, RANGES, rollup, scale5, suppress, windowsFor, type EventRow } from "../lib/server/aggregate.ts";

assert.equal(MIN_GROUP_SIZE, 5, "MIN_GROUP_SIZE changed; review these asserts");

// ── suppress() ──
const S = { suppressed: true };
for (const n of [0, 1, 3, 4, -10, NaN, Infinity * -1, null, undefined]) {
  const c = suppress(42, n as number);
  assert.deepEqual(c, S, `group size ${n} must be suppressed`);
  assert.deepEqual(Object.keys(c), ["suppressed"], "a suppressed cell carries nothing else");
}
assert.deepEqual(suppress(42, 5), { value: 42 }, "exactly MIN_GROUP_SIZE is shown");
assert.deepEqual(suppress(42, 86), { value: 42 });
assert.deepEqual(suppress(null, 86), { missing: true });
assert.deepEqual(suppress(42, 9, 10), S, "custom floor respected");
assert.notEqual(suppress(1, 1), suppress(1, 1), "fresh object each time (no shared mutable singleton)");

// ── Synthetic facility ──
const today = "2026-10-19";
const wins = windowsFor(today);
const days = wins.filter((w) => w.key.startsWith("d")).map((w) => w.from); // last 14 days
const big = "00000000-0000-4000-8000-000000000011"; // 6 people + 3 opted out
const small = "00000000-0000-4000-8000-000000000017"; // 4 people
const exact = "00000000-0000-4000-8000-000000000013"; // exactly 5 people, all check in at 8a and 2p
const empty = "00000000-0000-4000-8000-000000000019"; // nobody
const ids = { big, small, exact, empty };
const events: EventRow[] = [];
const person = (u: string, i: number) => `person-${u.slice(-2)}-${i}`;
for (const day of days) {
  for (let i = 0; i < 6; i++) {
    events.push({ person: person(big, i), unitId: big, day, hour: 8, kind: "checkin", source: "daily", mood: 4, stress: 3, tookBreak: i % 2 === 0 });
    events.push({ person: person(big, i), unitId: big, day, hour: 15, kind: "checkin", source: "pulse", mood: 4, stress: 3 });
  }
  if (day === days.at(-1)) events.push({ person: person(big, 0), unitId: big, day, hour: 9, kind: "request" });
  // Opted-out staff on the big unit answer the extremes; none of it may move a number.
  for (let i = 0; i < 3; i++) events.push({ person: `opt-${i}`, unitId: big, day, hour: 8, kind: "checkin", source: "daily", mood: 1, stress: 5, tookBreak: false, optedOut: true });
  for (let i = 0; i < 4; i++)
    events.push({ person: person(small, i), unitId: small, day, hour: 10, kind: "checkin", source: "daily", mood: 2, stress: 5, tookBreak: false });
  for (let i = 0; i < 5; i++) {
    events.push({ person: person(exact, i), unitId: exact, day, hour: 8, kind: "checkin", source: "daily", mood: 5, stress: 1, tookBreak: true });
    events.push({ person: person(exact, i), unitId: exact, day, hour: 14, kind: "checkin", source: "pulse", mood: 5, stress: 2 });
  }
}
// One person on the exact unit checks in alone at 8p: that slot (1 person) must be hidden.
events.push({ person: person(exact, 0), unitId: exact, day: today, hour: 20, kind: "checkin", source: "pulse", mood: 1, stress: 5 });

const rows = rollup(events, wins);
const units = [
  { id: big, name: "Emergency" },
  { id: small, name: "Wound Care" },
  { id: exact, name: "Cardiology" },
  { id: empty, name: "Oncology" }
];
const enrolled = { [big]: 12, [small]: 4, [exact]: 5 };

// ── rollup excludes opted-out staff ──
const bigWeek = rows.find((r) => r.win === "w7" && r.unitId === big && r.slot === null)!;
assert.equal(bigWeek.checkinPeople, 6, "opted-out staff are not counted");
assert.equal(bigWeek.moodSum / bigWeek.moodN, 4, "opted-out answers don't move the mean");

for (const metric of METRICS) {
  for (const range of RANGES) {
    const v = buildFacilityView({
      units, today, rows, enrolled, metric, range,
      cats: [{ unitId: big, cat: "food", n: 1 }, { unitId: small, cat: "pet", n: 3 }],
      handled: { n: 7, people: 3 },
      supportSent: 2
    });
    const out = JSON.stringify(v);
    const where = `${metric}/${range}`;

    // No per-person data anywhere in the output.
    assert.ok(!out.includes("person-") && !out.includes("opt-"), `${where}: a person key leaked`);
    assert.ok(!out.includes('"pet"'), `${where}: the small unit's request category leaked`);

    // < 5 people: hidden, carries only id/name/state (+ the fixed support list on the radar).
    for (const id of [ids.small]) {
      const u = v.units.find((x) => x.id === id)!;
      assert.equal(u.state, "hidden", `${where}: 4-person unit must be hidden`);
      assert.deepEqual(Object.keys(u).sort(), ["id", "name", "state"]);
      const r = v.radar.find((x) => x.unitId === id)!;
      assert.equal(r.state, "hidden");
      assert.deepEqual(Object.keys(r).sort(), ["acts", "defaultPick", "name", "state", "support", "unitId"], "hidden radar entry carries no data");
      const d = v.departments.find((x) => x.unitId === id)!;
      assert.deepEqual(Object.keys(d).sort(), ["name", "state", "unitId"]);
    }
    // No data: "empty", never visible.
    assert.equal(v.units.find((x) => x.id === empty)!.state, "empty", `${where}: a unit with no rows must not be visible`);
    assert.equal(v.radar.find((x) => x.unitId === empty)!.state, "empty");

    // ≥ 5: shown.
    const b = v.units.find((x) => x.id === big)!;
    const e = v.units.find((x) => x.id === exact)!;
    assert.equal(b.state, "visible", `${where}: 6-person unit visible`);
    assert.equal(e.state, "visible", `${where}: exactly-5 unit visible`);
    if (b.state === "visible" && e.state === "visible") {
      assert.ok("value" in b.cells[1], `${where}: big unit 8a cell visible`);
      assert.ok("value" in e.cells[1], `${where}: exact unit 8a cell visible`);
      // 8p on the exact unit: only one person (and only today). Hidden or no data, never a value.
      assert.ok(!("value" in e.cells[7]), `${where}: 1-person slot must not show a value`);
      if (range === "today") assert.deepEqual(e.cells[7], S, `${where}: 1-person slot is exactly { suppressed: true }`);
      assert.equal(b.staff, 12);
    }
    if (metric === "mood" && range === "week" && b.state === "visible") assert.deepEqual(b.cells[1], { value: Math.round(scale5(4)) });
    if (metric === "missed_breaks" && range === "week" && b.state === "visible") assert.deepEqual(b.cells[1], { value: 50 });

    // Facility-wide numbers only pool visible units: mood (4 and 5 → 75 and 100) never sees the 2s.
    assert.ok(v.kpis.participation && "value" in v.kpis.participation, `${where}: participation visible`);
    if ("value" in v.kpis.participation) {
      assert.equal(v.kpis.participation.checkedIn, 15, "6 + 4 + 5 consenting people checked in");
      assert.equal(v.kpis.participation.enrolled, 21);
    }
    assert.ok("value" in v.kpis.mood);
    if ("value" in v.kpis.mood) assert.ok(v.kpis.mood.value >= 75, `${where}: facility mood must exclude the hidden unit`);
    assert.deepEqual(v.kpis.handled, S, `${where}: requests handled from 3 people must be hidden`);
    assert.deepEqual(v.kpis.supportSent, { value: 2 });
    assert.ok(v.trend.mood.every((x) => x === null || x >= 75), `${where}: trend must exclude the hidden unit`);
    assert.equal(v.noCheckins, false);
  }
}

// A brand-new facility: no check-ins, everything empty, no KPI numbers.
const fresh = buildFacilityView({ units, today, rows: [], enrolled, metric: "strain", range: "today" });
assert.equal(fresh.noCheckins, true);
assert.ok(fresh.units.every((u) => u.state === "empty"));
assert.deepEqual(fresh.kpis.participation, S);
assert.deepEqual(fresh.kpis.mood, S);
assert.ok(fresh.trend.mood.every((x) => x === null) && fresh.surge.values.every((x) => x === null));

// A facility whose only data is a 3-person unit: still nothing visible.
const tiny = rollup(events.filter((x) => x.unitId === small).map((x) => ({ ...x, person: x.person.endsWith("3") ? x.person.replace(/3$/, "2") : x.person })), wins);
const t = buildFacilityView({ units, today, rows: tiny, enrolled, metric: "mood", range: "week" });
assert.ok(t.units.every((u) => u.state !== "visible"));
assert.deepEqual(t.kpis.participation, S);
assert.deepEqual(t.kpis.mood, S);

console.log("check-suppression: all asserts passed");
