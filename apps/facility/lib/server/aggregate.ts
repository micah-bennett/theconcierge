/*
 * Facility View aggregation and privacy suppression. Pure functions, no database access, so
 * scripts/check-suppression.mts can exercise them directly. lib/server/facility.ts loads the
 * rows and calls buildFacilityView().
 *
 * PRIVACY (docs/portal/architecture.md → Privacy rules): anything built from fewer than
 * MIN_GROUP_SIZE people leaves this module as exactly `{ suppressed: true }`, with no value,
 * no group size and no derived numbers. Suppressed units are also left out of every
 * facility-wide average, so a value can't be recovered by differencing.
 *
 * Only import this from server code (route handlers, lib/server/facility.ts).
 */
import { MIN_GROUP_SIZE } from "@hop/shared/brand";

// ── Shapes sent to the browser ───────────────────────────────────────────────

export type Suppressed = { suppressed: true };
export type Cell = { value: number } | Suppressed | { missing: true };

export const METRICS = ["strain", "stress", "missed_breaks", "requests"] as const;
export type Metric = (typeof METRICS)[number];
export const RANGES = ["today", "week", "next"] as const;
export type Range = (typeof RANGES)[number];

/** The two-hour slots the signals are recorded in (6a–10p). */
export const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
export const HOUR_LABELS = HOURS.map((h) => (h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`));

export type Level = "high" | "watch" | "steady";

export interface SupportState {
  status: "sent" | "resolved";
  at: string;
  actions: string[];
  /** The Console request's status, so the leader can see HOP picked it up. */
  requestStatus: string | null;
}

export type UnitView =
  | { id: string; name: string; suppressed: true }
  | { id: string; name: string; suppressed: false; staff: number | null; cells: Cell[]; liveRequests7d: Cell };

export type RadarEntry =
  | { unitId: string; name: string; suppressed: true }
  | {
      unitId: string;
      name: string;
      suppressed: false;
      staff: number | null;
      score: number;
      trend: number;
      level: Level;
      signal: string;
      drivers: string[];
      acts: string[];
      defaultPick: number[];
      support: SupportState | null;
    };

// ── The privacy floor ────────────────────────────────────────────────────────

/**
 * THE privacy guarantee. Returns `{ value }` only when the value was built from at least
 * `min` people; otherwise a fresh `{ suppressed: true }` with nothing else on it. A missing,
 * non-finite or negative group size is treated as too small.
 */
export function suppress(value: number | null | undefined, groupSize: number | null | undefined, min: number = MIN_GROUP_SIZE): Cell {
  if (typeof groupSize !== "number" || !Number.isFinite(groupSize) || groupSize < min) return { suppressed: true };
  if (typeof value !== "number" || !Number.isFinite(value)) return { missing: true };
  return { value };
}

export const isValue = (c: Cell): c is { value: number } => "value" in c;

// ── Suggested support, static per score band ─────────────────────────────────

/** Score bands, from the mockup's LV(): High ≥ 75, Watch ≥ 55. [CONFIRM thresholds] */
export const levelFor = (score: number): Level => (score >= 75 ? "high" : score >= 55 ? "watch" : "steady");

/** The mockup's suggested actions, as fixed content per band. Steady units need no action. */
export const ACTIONS_BY_LEVEL: Record<Level, { acts: string[]; pick: number[] }> = {
  high: { acts: ["Dinner to the unit", "Float pool support", "Rides home after shift", "Concierge meal program"], pick: [0, 2] },
  watch: { acts: ["Concierge meal program", "Quiet room reset", "Five Minute Reset push", "Errand runs between shifts"], pick: [0] },
  steady: { acts: [], pick: [] }
};

/** Every action a leader may send. The POST body is checked against this, so free text never reaches the Console. */
export const ALL_ACTIONS: readonly string[] = [...new Set(Object.values(ACTIONS_BY_LEVEL).flatMap((l) => l.acts))];

// ── Rows in ──────────────────────────────────────────────────────────────────

export interface SignalRow {
  unitId: string;
  /** YYYY-MM-DD */
  day: string;
  metric: string;
  /** null = the daily row */
  hour: number | null;
  value: number;
  groupSize: number;
}

export interface BuildInput {
  units: { id: string; name: string }[];
  signals: SignalRow[];
  metric: Metric;
  range: Range;
  /** Latest support action per unit (last 7 days). */
  support?: Record<string, SupportState>;
  /** Live HOP request counts (last 7 days) and enrolled staff per unit, from portal_requests. */
  liveRequests?: Record<string, { count: number; enrolled: number }>;
  min?: number;
}

export interface FacilityViewData {
  metric: Metric;
  range: Range;
  /** The latest day with signals; "today" means this day. */
  asOf: string | null;
  hours: string[];
  units: UnitView[];
  /** Per hour, the mean over visible (non-suppressed) units only. */
  hourAvg: (number | null)[];
  radar: RadarEntry[];
  /** Per day for the last 14 days: each visible unit's peak two-hour strain, averaged. */
  surge: { days: string[]; values: (number | null)[] };
}

// ── Aggregation ──────────────────────────────────────────────────────────────

type Pt = { v: number; n: number };
const DAILY = -1;
/** A two-hour slot at or above this strain counts as running hot (the mockup's orange band). */
export const HOT = 62;
const clamp = (v: number) => Math.max(5, Math.min(99, Math.round(v)));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
const addDays = (day: string, d: number) => new Date(Date.parse(day + "T00:00:00Z") + d * 86400000).toISOString().slice(0, 10);

/** Strain blend from the mockup: stress 45%, missed breaks 35%, request volume 20%. [CONFIRM weighting] */
export const STRAIN_WEIGHTS = { stress: 0.45, missed_breaks: 0.35, requests: 0.2 } as const;

export function buildFacilityView(input: BuildInput): FacilityViewData {
  const min = input.min ?? MIN_GROUP_SIZE;
  const { metric, range } = input;

  // unit → day → metric → hour → point
  const idx = new Map<string, Map<string, Map<string, Map<number, Pt>>>>();
  const unitSize = new Map<string, number>();
  const allDays = new Set<string>();
  for (const r of input.signals) {
    if (!Number.isFinite(r.value)) continue;
    allDays.add(r.day);
    const u = idx.get(r.unitId) ?? new Map();
    idx.set(r.unitId, u);
    const d = u.get(r.day) ?? new Map();
    u.set(r.day, d);
    const m = d.get(r.metric) ?? new Map();
    d.set(r.metric, m);
    m.set(r.hour ?? DAILY, { v: r.value, n: r.groupSize });
    // A unit's size is the smallest group any of its rows was built from (conservative).
    unitSize.set(r.unitId, Math.min(unitSize.get(r.unitId) ?? Infinity, r.groupSize));
  }

  const days = [...allDays].sort();
  const asOf = days.at(-1) ?? null;
  const week = asOf ? Array.from({ length: 7 }, (_, i) => addDays(asOf, i - 6)) : [];
  const prior = asOf ? Array.from({ length: 7 }, (_, i) => addDays(asOf, i - 13)) : [];

  const raw = (unit: string, day: string, m: string, hour: number): Pt | null => idx.get(unit)?.get(day)?.get(m)?.get(hour) ?? null;
  const point = (unit: string, day: string, m: Metric, hour: number): Pt | null => {
    if (m !== "strain") return raw(unit, day, m, hour);
    const stored = raw(unit, day, "strain", hour);
    if (stored) return stored;
    const s = raw(unit, day, "stress", hour), b = raw(unit, day, "missed_breaks", hour), q = raw(unit, day, "requests", hour);
    if (!s || !b || !q) return null;
    return {
      v: STRAIN_WEIGHTS.stress * s.v + STRAIN_WEIGHTS.missed_breaks * b.v + STRAIN_WEIGHTS.requests * q.v,
      n: Math.min(s.n, b.n, q.n)
    };
  };
  /** Mean over `ds`; the group size is the smallest of the rows used. */
  const over = (unit: string, ds: string[], m: Metric, hour: number): Pt | null => {
    const pts = ds.map((d) => point(unit, d, m, hour)).filter((p): p is Pt => !!p);
    if (!pts.length) return null;
    return { v: mean(pts.map((p) => p.v))!, n: Math.min(...pts.map((p) => p.n)) };
  };
  /** One heat-map cell for the selected range, before suppression. */
  const rangePoint = (unit: string, m: Metric, hour: number, r: Range): Pt | null => {
    if (!asOf) return null;
    if (r === "today") return point(unit, asOf, m, hour);
    const w = over(unit, week, m, hour);
    if (r === "week" || !w) return w;
    // "next": the 7-day mean, nudged by the last 3 days vs the 4 before. [CONFIRM forecast model]
    const recent = over(unit, week.slice(4), m, hour), earlier = over(unit, week.slice(0, 4), m, hour);
    const drift = recent && earlier && earlier.v > 0 ? Math.max(-0.1, Math.min(0.15, recent.v / earlier.v - 1)) : 0;
    return { v: w.v * (1 + drift), n: Math.min(w.n, recent?.n ?? Infinity, earlier?.n ?? Infinity) };
  };
  const cell = (p: Pt | null): Cell => (p ? suppress(clamp(p.v), p.n, min) : suppress(null, Infinity, min));
  const unitVisible = (id: string) => (unitSize.get(id) ?? Infinity) >= min;

  // ── Heat map ──
  const units: UnitView[] = input.units.map((u) => {
    if (!unitVisible(u.id)) return { id: u.id, name: u.name, suppressed: true };
    const live = input.liveRequests?.[u.id];
    return {
      id: u.id,
      name: u.name,
      suppressed: false,
      staff: unitSize.has(u.id) ? unitSize.get(u.id)! : null,
      cells: HOURS.map((h) => cell(rangePoint(u.id, metric, h, range))),
      liveRequests7d: suppress(live ? live.count : 0, live ? live.enrolled : 0, min)
    };
  });

  const visible = units.filter((u): u is Extract<UnitView, { suppressed: false }> => !u.suppressed);
  const hourAvg = HOURS.map((_, i) => {
    const m = mean(visible.map((u) => u.cells[i]).filter(isValue).map((c) => c.value));
    return m === null ? null : Math.round(m);
  });

  // ── Burnout Radar: per unit, from its own (already suppressed) strain cells ──
  const strainCells = (unit: string, ds: string[]) => HOURS.map((h) => cell(over(unit, ds, "strain", h)));
  /**
   * Score = mean of the unit's three hottest two-hour strain slots, plus 2 per slot running hot
   * (strain ≥ 62), capped at 100. Sustained peak load drives burnout. [CONFIRM formula]
   */
  const scoreOf = (cs: Cell[]) => {
    const all = cs.filter(isValue).map((c) => c.value);
    if (!all.length) return null;
    const top = [...all].sort((a, b) => b - a).slice(0, 3);
    const hot = all.filter((v) => v >= HOT).length;
    return Math.min(100, Math.round(mean(top)! + 2 * hot));
  };
  const metricMean = (unit: string, m: Metric, ds: string[]) => {
    const cs = HOURS.map((h) => cell(over(unit, ds, m, h))).filter(isValue);
    return cs.length ? mean(cs.map((c) => c.value))! : null;
  };
  const pctChange = (a: number | null, b: number | null) => (a !== null && b !== null && b > 0 ? Math.round((a / b - 1) * 100) : null);

  const radar: RadarEntry[] = input.units.map((u) => {
    if (!unitVisible(u.id)) return { unitId: u.id, name: u.name, suppressed: true };
    const now = strainCells(u.id, week);
    const score = scoreOf(now) ?? 0;
    const before = scoreOf(strainCells(u.id, prior));
    const level = levelFor(score);

    const stress = HOURS.map((h) => cell(over(u.id, week, "stress", h)));
    let peak = -1, peakV = -1;
    stress.forEach((c, i) => { if (isValue(c) && c.value > peakV) { peakV = c.value; peak = i; } });
    const hot = now.filter((c) => isValue(c) && c.value >= HOT).length;
    const strainPeak = now.reduce((best, c, i) => (isValue(c) && (best < 0 || c.value > (now[best] as { value: number }).value) ? i : best), -1);

    const drivers: string[] = [];
    if (peak >= 0) drivers.push(`Stress peaks at ${HOUR_LABELS[peak]} (${peakV})`);
    const mb = pctChange(metricMean(u.id, "missed_breaks", week), metricMean(u.id, "missed_breaks", prior));
    if (mb !== null) drivers.push(mb === 0 ? "Missed breaks flat vs last week" : `Missed breaks ${mb > 0 ? "up" : "down"} ${Math.abs(mb)}% vs last week`);
    const rq = pctChange(metricMean(u.id, "requests", week), metricMean(u.id, "requests", prior));
    if (rq !== null) drivers.push(rq === 0 ? "Request volume flat" : `Request volume ${rq > 0 ? "up" : "down"} ${Math.abs(rq)}%`);

    const signal =
      strainPeak < 0
        ? "Not enough signal this week."
        : `${level === "steady" ? "Steady. " : ""}Strain peaks around ${HOUR_LABELS[strainPeak]} (${(now[strainPeak] as { value: number }).value}). ` +
          (hot === 0 ? "No two-hour slot ran hot this week." : `${hot} of ${HOURS.length} two-hour slots ran hot this week.`);

    const band = ACTIONS_BY_LEVEL[level];
    return {
      unitId: u.id,
      name: u.name,
      suppressed: false,
      staff: unitSize.get(u.id) ?? null,
      score,
      trend: before === null ? 0 : score - before,
      level,
      signal,
      drivers,
      acts: band.acts,
      defaultPick: band.pick,
      support: input.support?.[u.id] ?? null
    };
  });

  // ── Surge Shield: 14 days of each day's peak two-hour strain, averaged over visible units ──
  const surgeDays = asOf ? Array.from({ length: 14 }, (_, i) => addDays(asOf, i - 13)) : [];
  const surge = {
    days: surgeDays,
    values: surgeDays.map((d) => {
      const vs = visible
        .map((u) => HOURS.map((h) => cell(point(u.id, d, "strain", h))).filter(isValue).map((c) => c.value))
        .filter((xs) => xs.length)
        .map((xs) => Math.max(...xs));
      const m = mean(vs);
      return m === null ? null : Math.round(m);
    })
  };

  return { metric, range, asOf, hours: HOUR_LABELS, units, hourAvg, radar, surge };
}
