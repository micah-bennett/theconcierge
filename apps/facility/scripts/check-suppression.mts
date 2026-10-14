// Asserts the Facility View privacy floor. Run from the repo root:
//   node --experimental-strip-types apps/facility/scripts/check-suppression.mts
// (Node 23.6+ strips types by default, so plain `node apps/facility/scripts/check-suppression.mts` works too.)
import assert from "node:assert/strict";
import { MIN_GROUP_SIZE } from "@hop/shared/brand";
import { buildFacilityView, HOURS, suppress, type SignalRow } from "../lib/server/aggregate.ts";

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

// ── buildFacilityView(): a big unit, a 3-person unit, and a big unit with one small day ──
const big = "00000000-0000-4000-8000-000000000011";
const small = "00000000-0000-4000-8000-000000000017";
const mixed = "00000000-0000-4000-8000-000000000013";
const SECRET = 77.123; // a value only the small unit has, so we can grep for it
const days = Array.from({ length: 14 }, (_, i) => new Date(Date.UTC(2026, 9, 1 + i)).toISOString().slice(0, 10));
const rows: SignalRow[] = [];
for (const day of days) {
  for (const metric of ["stress", "missed_breaks", "requests"]) {
    for (const hour of [...HOURS, null]) {
      rows.push({ unitId: big, day, metric, hour, value: 60, groupSize: 86 });
      rows.push({ unitId: small, day, metric, hour, value: SECRET, groupSize: 3 });
      // The mixed unit dips to 4 people on the last day: its "today" cells must hide, and the
      // unit itself (smallest group in the window) must hide too.
      rows.push({ unitId: mixed, day, metric, hour, value: 50, groupSize: day === days.at(-1) ? 4 : 48 });
    }
  }
}
const units = [
  { id: big, name: "Emergency" },
  { id: small, name: "Wound Care" },
  { id: mixed, name: "Cardiology" }
];

for (const metric of ["strain", "stress", "missed_breaks", "requests"] as const) {
  for (const range of ["today", "week", "next"] as const) {
    const v = buildFacilityView({
      units,
      signals: rows,
      metric,
      range,
      liveRequests: { [big]: { count: 12, enrolled: 9 }, [small]: { count: 2, enrolled: 2 } }
    });
    const out = JSON.stringify(v);
    assert.ok(!out.includes("77.1") && !out.includes(String(Math.round(SECRET))), `${metric}/${range}: small unit's value leaked`);
    assert.ok(!out.includes('"staff":3') && !out.includes('"staff":4'), `${metric}/${range}: small group size leaked`);

    for (const id of [small, mixed]) {
      const u = v.units.find((x) => x.id === id)!;
      assert.equal(u.suppressed, true, `${metric}/${range}: unit ${u.name} must be suppressed`);
      assert.deepEqual(Object.keys(u).sort(), ["id", "name", "suppressed"], "suppressed unit carries only id + name");
      const r = v.radar.find((x) => x.unitId === id)!;
      assert.deepEqual(Object.keys(r).sort(), ["name", "suppressed", "unitId"], "suppressed radar entry carries only id + name");
    }
    const b = v.units.find((x) => x.id === big)!;
    assert.equal(b.suppressed, false);
    if (!b.suppressed) {
      assert.ok(b.cells.every((c) => "value" in c), "big unit cells are visible");
      assert.deepEqual(b.liveRequests7d, { value: 12 });
    }
    // Facility-wide numbers average only visible units, so they equal the big unit's own.
    assert.ok(v.hourAvg.every((x) => x === (b.suppressed ? null : (b.cells[0] as { value: number }).value)), "hourAvg must exclude suppressed units");
    assert.ok(v.surge.values.every((x) => x === 60), "surge must exclude suppressed units");
  }
}

console.log("check-suppression: all asserts passed");
