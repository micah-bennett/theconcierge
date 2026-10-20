/*
 * Facility View aggregation and privacy suppression. Pure functions, no database access, so
 * scripts/check-suppression.mts can exercise them directly. lib/server/facility.ts runs one SQL
 * rollup over portal_checkins + portal_requests (aggregates only: counts, sums and distinct-people
 * counts per window / unit / two-hour slot) and calls buildFacilityView() on the result.
 *
 * `rollup()` below is the reference implementation of that SQL. It is what the check script
 * feeds with synthetic people, so if you change the SQL in facility.ts, change rollup() the same
 * way (and the other way round).
 *
 * PRIVACY (docs/portal/architecture.md → Privacy rules):
 * - Anything built from fewer than MIN_GROUP_SIZE distinct people in its window leaves this
 *   module as exactly `{ suppressed: true }`: no value, no group size, no derived numbers.
 * - Units below the floor are left out of every facility-wide average, so a value can't be
 *   recovered by differencing.
 * - No user id, name, check-in word or per-person value ever reaches this module's output. The
 *   SQL never selects them; rollup()'s `person` key is only used to count distinct people.
 * - Staff whose "Share anonymized totals with my hospital" consent is off are excluded from
 *   every number (check-ins and requests).
 *
 * Only import this from server code (route handlers, lib/server/facility.ts). The client imports
 * types only.
 */
import { MIN_GROUP_SIZE } from "@hop/shared/brand";

// ── Shapes sent to the browser ───────────────────────────────────────────────

export type Suppressed = { suppressed: true };
export type Cell = { value: number } | Suppressed | { missing: true };

export const METRICS = ["strain", "stress", "missed_breaks", "requests", "mood"] as const;
export type Metric = (typeof METRICS)[number];
export const RANGES = ["today", "week", "next"] as const;
export type Range = (typeof RANGES)[number];

/**
 * Two-hour slots (start hour, America/New_York). A check-in or request at hour h lands in slot
 * h − h % 2; the 10p slot also takes the overnight hours 0–5 (10p to 6a).
 */
export const HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22] as const;
export const HOUR_LABELS = HOURS.map((h) => (h === 22 ? "10p+" : h === 12 ? "12p" : h > 12 ? `${h - 12}p` : `${h}a`));
export const slotOf = (hour: number): number => (hour < 6 ? 22 : Math.min(22, hour - (hour % 2)));

export type Level = "high" | "watch" | "steady";
/** visible: ≥ MIN_GROUP_SIZE people checked in over the last 7 days; hidden: 1 to MIN−1; empty: nobody. */
export type UnitState = "visible" | "hidden" | "empty";

export interface SupportState {
  status: "sent" | "resolved";
  at: string;
  actions: string[];
  /** The Console request's status, so the leader can see HOP picked it up. */
  requestStatus: string | null;
}

export type UnitView =
  | { id: string; name: string; state: "hidden" | "empty" }
  | { id: string; name: string; state: "visible"; staff: number; cells: Cell[]; requests7d: Cell };

/** Units without visible data still get a fixed, data-free list of support the leader can send. */
type NoSignalSupport = { acts: string[]; defaultPick: number[]; support: SupportState | null };

export type RadarEntry =
  | ({ unitId: string; name: string; state: "hidden" | "empty" } & NoSignalSupport)
  | {
      unitId: string;
      name: string;
      state: "visible";
      staff: number;
      score: number;
      trend: number;
      level: Level;
      signal: string;
      drivers: string[];
      acts: string[];
      defaultPick: number[];
      support: SupportState | null;
    };

export type DeptRow =
  | { unitId: string; name: string; state: "hidden" | "empty" }
  | {
      unitId: string;
      name: string;
      state: "visible";
      enrolled: number;
      /** Check-ins (daily + pulse) in the last 7 days. */
      checkins: number;
      /** 0–100, higher = better. */
      mood: Cell;
      /** 0–100. */
      stress: Cell;
      /** % of daily check-ins that said no break. */
      missedBreaks: Cell;
      /** The most common HOP request category in the last 7 days, or null when there were none. */
      topRequest: string | null;
      risk: number;
      level: Level;
    };

export type KpiValue = { value: number } | Suppressed;

export interface Kpis {
  /** Distinct staff who checked in over the last 7 days, as a % of enrolled staff. */
  participation: ({ value: number; checkedIn: number; enrolled: number }) | Suppressed;
  /** Mood 0–100 over units above the floor, last 7 days; delta vs the 7 days before (null if that week is hidden). */
  mood: ({ value: number; delta: number | null }) | Suppressed;
  highAlert: { value: number; of: number };
  /** Completed HOP requests from this facility's staff, last 7 days. */
  handled: KpiValue;
  /** Support actions this facility sent, last 7 days (the leader's own actions, not staff data). */
  supportSent: { value: number };
}

export interface FacilityViewData {
  metric: Metric;
  range: Range;
  /** Today's date in America/New_York. "Today" always means this day. */
  asOf: string;
  /** No check-ins at all in the last 8 weeks: the UI shows the getting-started state. */
  noCheckins: boolean;
  hours: string[];
  units: UnitView[];
  /** Per hour, the mean over visible units' visible cells only. */
  hourAvg: (number | null)[];
  radar: RadarEntry[];
  /** Per day for the last 14 days: each visible unit's peak two-hour strain, averaged. */
  surge: { days: string[]; values: (number | null)[] };
  departments: DeptRow[];
  /** 8 weeks (rolling 7-day windows ending today): facility mood and stress 0–100; null = fewer than the floor. */
  trend: { weeks: string[]; mood: (number | null)[]; stress: (number | null)[] };
  kpis: Kpis;
}

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
/** Offered for units with no visible data. Fixed content, so it says nothing about the unit. */
export const NO_SIGNAL_ACTIONS = ACTIONS_BY_LEVEL.watch;

/** Every action a leader may send. The POST body is checked against this, so free text never reaches the Console. */
export const ALL_ACTIONS: readonly string[] = [...new Set(Object.values(ACTIONS_BY_LEVEL).flatMap((l) => l.acts))];

// ── Scales ───────────────────────────────────────────────────────────────────

/** Mean of a 1–5 answer → 0–100: (x − 1) / 4 × 100. */
export const scale5 = (mean: number) => ((mean - 1) / 4) * 100;

/**
 * HOP requests → 0–100: requests per enrolled person per two-hour slot per day, where
 * REQUESTS_FULL_SCALE (1 request for every 10 enrolled staff in one slot on one day) = 100.
 * value = min(100, 100 × requests / (enrolled × days × slots × REQUESTS_FULL_SCALE)).
 * slots = 1 for a slot cell, 9 for a whole-day figure. [CONFIRM scale]
 */
export const REQUESTS_FULL_SCALE = 0.1;
export function requestsScaled(requests: number, enrolled: number, days: number, slots = 1): number {
  const base = Math.max(1, enrolled) * Math.max(1, days) * Math.max(1, slots) * REQUESTS_FULL_SCALE;
  return Math.min(100, (100 * requests) / base);
}

/** Strain blend from the mockup: stress 45%, missed breaks 35%, request volume 20%. [CONFIRM weighting] */
export const STRAIN_WEIGHTS = { stress: 0.45, missed_breaks: 0.35, requests: 0.2 } as const;

// ── Windows ──────────────────────────────────────────────────────────────────

export interface Win {
  key: string;
  /** YYYY-MM-DD, inclusive */
  from: string;
  to: string;
  days: number;
}

const addDays = (day: string, d: number) => new Date(Date.parse(day + "T00:00:00Z") + d * 86400000).toISOString().slice(0, 10);

/** Today's date in America/New_York. */
export function etDay(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/New_York", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/**
 * d0…d13: the last 14 single days (d13 = today). w0…w7: eight rolling 7-day windows ending today
 * (w7 = the last 7 days, w6 = the 7 before). recent / earlier: the last 3 days and the 4 before,
 * for the forecast.
 */
export function windowsFor(today: string): Win[] {
  const out: Win[] = [];
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i - 13);
    out.push({ key: `d${i}`, from: d, to: d, days: 1 });
  }
  for (let i = 0; i < 8; i++) {
    const to = addDays(today, (i - 7) * 7);
    out.push({ key: `w${i}`, from: addDays(to, -6), to, days: 7 });
  }
  out.push({ key: "recent", from: addDays(today, -2), to: today, days: 3 });
  out.push({ key: "earlier", from: addDays(today, -6), to: addDays(today, -3), days: 4 });
  return out;
}
const TODAY = "d13", WEEK = "w7", PRIOR = "w6";

// ── Rows in ──────────────────────────────────────────────────────────────────

/**
 * One aggregate bucket: a window × unit × slot (GROUPING SETS (win, unit, slot), (win, unit),
 * (win)). Counts and sums only. unitId null = all units; slot null = the whole window.
 */
export interface AggRow {
  win: string;
  unitId: string | null;
  slot: number | null;
  /** Distinct people with a check-in or a request in the bucket. */
  people: number;
  /** Distinct people with a check-in in the bucket. */
  checkinPeople: number;
  checkins: number;
  moodSum: number;
  moodN: number;
  stressSum: number;
  stressN: number;
  /** Daily check-ins that answered the break question. */
  breakN: number;
  /** …of which took_break = false. */
  missedN: number;
  requests: number;
}

/** Requests in the last 7 days per unit and category. */
export interface CatRow {
  unitId: string;
  cat: string;
  n: number;
}

/** The input rollup() takes: one check-in or request. Only used by the check script. */
export interface EventRow {
  /** Opaque, only used to count distinct people. Never copied to the output. */
  person: string;
  unitId: string;
  /** ET day */
  day: string;
  /** ET hour 0–23 */
  hour: number;
  kind: "checkin" | "request";
  source?: "daily" | "pulse";
  mood?: number | null;
  stress?: number | null;
  tookBreak?: boolean | null;
  /** The person turned "Share anonymized totals with my hospital" off. */
  optedOut?: boolean;
}

/** Reference implementation of the SQL rollup in lib/server/facility.ts. Keep the two in step. */
export function rollup(events: EventRow[], wins: Win[]): AggRow[] {
  type Acc = AggRow & { _p: Set<string>; _c: Set<string> };
  const acc = new Map<string, Acc>();
  const get = (win: string, unitId: string | null, slot: number | null) => {
    const k = `${win}|${unitId ?? "*"}|${slot ?? "*"}`;
    let a = acc.get(k);
    if (!a) {
      a = { win, unitId, slot, people: 0, checkinPeople: 0, checkins: 0, moodSum: 0, moodN: 0, stressSum: 0, stressN: 0, breakN: 0, missedN: 0, requests: 0, _p: new Set(), _c: new Set() };
      acc.set(k, a);
    }
    return a;
  };
  for (const e of events) {
    if (e.optedOut) continue;
    const slot = slotOf(e.hour);
    for (const w of wins) {
      if (e.day < w.from || e.day > w.to) continue;
      for (const a of [get(w.key, e.unitId, slot), get(w.key, e.unitId, null), get(w.key, null, null)]) {
        a._p.add(e.person);
        if (e.kind === "request") {
          a.requests++;
          continue;
        }
        a._c.add(e.person);
        a.checkins++;
        if (typeof e.mood === "number") { a.moodSum += e.mood; a.moodN++; }
        if (typeof e.stress === "number") { a.stressSum += e.stress; a.stressN++; }
        if (e.source !== "pulse" && typeof e.tookBreak === "boolean") {
          a.breakN++;
          if (!e.tookBreak) a.missedN++;
        }
      }
    }
  }
  return [...acc.values()].map(({ _p, _c, ...a }) => ({ ...a, people: _p.size, checkinPeople: _c.size }));
}

export interface BuildInput {
  units: { id: string; name: string }[];
  /** Today in America/New_York (YYYY-MM-DD). */
  today: string;
  rows: AggRow[];
  /** Enrolled (active staff profiles) per unit. */
  enrolled: Record<string, number>;
  cats?: CatRow[];
  /** Completed requests in the last 7 days and how many distinct staff they came from. */
  handled?: { n: number; people: number };
  supportSent?: number;
  metric: Metric;
  range: Range;
  /** Latest support action per unit (last 7 days). */
  support?: Record<string, SupportState>;
  min?: number;
}

// ── Aggregation ──────────────────────────────────────────────────────────────

type Pt = { v: number; n: number };
/** A two-hour slot at or above this strain counts as running hot (the mockup's orange band). */
export const HOT = 62;
const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

export function buildFacilityView(input: BuildInput): FacilityViewData {
  const min = input.min ?? MIN_GROUP_SIZE;
  const { metric, range, today } = input;
  const wins = new Map(windowsFor(today).map((w) => [w.key, w]));

  const idx = new Map<string, AggRow>();
  for (const r of input.rows) idx.set(`${r.win}|${r.unitId ?? "*"}|${r.slot ?? "*"}`, r);
  const bucket = (win: string, unitId: string | null, slot: number | null) => idx.get(`${win}|${unitId ?? "*"}|${slot ?? "*"}`);
  const enrolledOf = (unitId: string) => input.enrolled[unitId] ?? 0;

  /** A metric's value in one bucket, before suppression; n = the distinct people it was built from. */
  const pt = (win: string, unitId: string, slot: number | null, m: Metric): Pt | null => {
    const b = bucket(win, unitId, slot);
    if (!b) return null;
    // A bucket that exists but has no answer for this metric still goes through the floor (value
    // NaN → `missing` only with ≥ min people), so "no answer" never tells a small group from "hidden".
    const none: Pt = { v: NaN, n: b.people };
    const stress = b.stressN ? { v: scale5(b.stressSum / b.stressN), n: b.checkinPeople } : null;
    const missed = b.breakN ? { v: (100 * b.missedN) / b.breakN, n: b.checkinPeople } : null;
    const reqs = {
      v: requestsScaled(b.requests, Math.max(enrolledOf(unitId), b.people), wins.get(win)?.days ?? 1, slot === null ? HOURS.length : 1),
      n: b.people
    };
    switch (m) {
      case "mood":
        return b.moodN ? { v: scale5(b.moodSum / b.moodN), n: b.checkinPeople } : none;
      case "stress":
        return stress ?? none;
      case "missed_breaks":
        return missed ?? none;
      case "requests":
        return reqs;
      case "strain": {
        // Needs a stress answer; if nobody answered the break question the weights renormalize.
        if (!stress) return none;
        const W = STRAIN_WEIGHTS;
        const wsum = W.stress + W.requests + (missed ? W.missed_breaks : 0);
        const v = (W.stress * stress.v + W.requests * reqs.v + (missed ? W.missed_breaks * missed.v : 0)) / wsum;
        return { v, n: Math.min(stress.n, reqs.n) };
      }
    }
  };
  const cellOf = (p: Pt | null): Cell => (p ? suppress(clamp(p.v), p.n, min) : { missing: true });

  /** One heat-map cell for the selected range, before suppression. */
  const rangePoint = (unitId: string, m: Metric, slot: number, r: Range): Pt | null => {
    if (r === "today") return pt(TODAY, unitId, slot, m);
    const w = pt(WEEK, unitId, slot, m);
    if (r === "week" || !w) return w;
    // "next": the 7-day mean, nudged by the last 3 days vs the 4 before. [CONFIRM forecast model]
    const recent = pt("recent", unitId, slot, m), earlier = pt("earlier", unitId, slot, m);
    const ok = (p: Pt | null): p is Pt => !!p && Number.isFinite(p.v);
    const drift = ok(recent) && ok(earlier) && earlier.v > 0 ? Math.max(-0.1, Math.min(0.15, recent.v / earlier.v - 1)) : 0;
    return { v: w.v * (1 + drift), n: Math.min(w.n, recent?.n ?? Infinity, earlier?.n ?? Infinity) };
  };

  const stateOf = (unitId: string, win = WEEK): UnitState => {
    const n = bucket(win, unitId, null)?.checkinPeople ?? 0;
    return n === 0 ? "empty" : n < min ? "hidden" : "visible";
  };

  // ── Heat map ──
  const units: UnitView[] = input.units.map((u) => {
    const state = stateOf(u.id);
    if (state !== "visible") return { id: u.id, name: u.name, state };
    const wk = bucket(WEEK, u.id, null)!;
    return {
      id: u.id,
      name: u.name,
      state,
      staff: enrolledOf(u.id),
      cells: HOURS.map((h) => cellOf(rangePoint(u.id, metric, h, range))),
      requests7d: suppress(wk.requests, wk.people, min)
    };
  });
  const visible = units.filter((u): u is Extract<UnitView, { state: "visible" }> => u.state === "visible");
  const hourAvg = HOURS.map((_, i) => {
    const m = mean(visible.map((u) => u.cells[i]).filter(isValue).map((c) => c.value));
    return m === null ? null : Math.round(m);
  });

  // ── Burnout Radar: per unit, from its own (already suppressed) strain cells ──
  const slotCells = (unitId: string, win: string, m: Metric) => HOURS.map((h) => cellOf(pt(win, unitId, h, m)));
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
  /** A unit's whole-window value, or null when that window is below the floor. */
  const unitVal = (unitId: string, win: string, m: Metric) => {
    const c = cellOf(pt(win, unitId, null, m));
    return isValue(c) ? c.value : null;
  };
  const pctChange = (a: number | null, b: number | null) => (a !== null && b !== null && b > 0 ? Math.round((a / b - 1) * 100) : null);
  const reqCount = (unitId: string, win: string) => {
    const b = bucket(win, unitId, null);
    return b && b.people >= min ? b.requests : null;
  };

  const noSignal = (unitId: string): NoSignalSupport => ({
    acts: NO_SIGNAL_ACTIONS.acts,
    defaultPick: NO_SIGNAL_ACTIONS.pick,
    support: input.support?.[unitId] ?? null
  });

  const radar: RadarEntry[] = input.units.map((u) => {
    const state = stateOf(u.id);
    if (state !== "visible") return { unitId: u.id, name: u.name, state, ...noSignal(u.id) };
    const now = slotCells(u.id, WEEK, "strain");
    const score = scoreOf(now) ?? 0;
    const before = scoreOf(slotCells(u.id, PRIOR, "strain"));
    const level = levelFor(score);

    const stress = slotCells(u.id, WEEK, "stress");
    let peak = -1, peakV = -1;
    stress.forEach((c, i) => { if (isValue(c) && c.value > peakV) { peakV = c.value; peak = i; } });
    const hot = now.filter((c) => isValue(c) && c.value >= HOT).length;
    const strainPeak = now.reduce((best, c, i) => (isValue(c) && (best < 0 || c.value > (now[best] as { value: number }).value) ? i : best), -1);

    const drivers: string[] = [];
    if (peak >= 0) drivers.push(`Stress peaks at ${HOUR_LABELS[peak]} (${peakV})`);
    const moodNow = unitVal(u.id, WEEK, "mood"), moodBefore = unitVal(u.id, PRIOR, "mood");
    if (moodNow !== null && moodBefore !== null) {
      const d = moodNow - moodBefore;
      drivers.push(d === 0 ? "Mood flat vs last week" : `Mood ${d > 0 ? "up" : "down"} ${Math.abs(d)} vs last week`);
    }
    const mb = pctChange(unitVal(u.id, WEEK, "missed_breaks"), unitVal(u.id, PRIOR, "missed_breaks"));
    if (mb !== null) drivers.push(mb === 0 ? "Missed breaks flat vs last week" : `Missed breaks ${mb > 0 ? "up" : "down"} ${Math.abs(mb)}% vs last week`);
    const rq = pctChange(reqCount(u.id, WEEK), reqCount(u.id, PRIOR));
    if (rq !== null) drivers.push(rq === 0 ? "Request volume flat" : `Request volume ${rq > 0 ? "up" : "down"} ${Math.abs(rq)}%`);

    const signal =
      strainPeak < 0
        ? "Not enough check-ins in any one time slot yet this week."
        : `${level === "steady" ? "Steady. " : ""}Strain peaks around ${HOUR_LABELS[strainPeak]} (${(now[strainPeak] as { value: number }).value}). ` +
          (hot === 0 ? "No two-hour slot ran hot this week." : `${hot} of ${HOURS.length} two-hour slots ran hot this week.`);

    const band = ACTIONS_BY_LEVEL[level];
    return {
      unitId: u.id,
      name: u.name,
      state,
      staff: enrolledOf(u.id),
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
  const surgeDays = Array.from({ length: 14 }, (_, i) => wins.get(`d${i}`)!.from);
  const surge = {
    days: surgeDays,
    values: surgeDays.map((_, i) => {
      const vs = visible
        .map((u) => slotCells(u.id, `d${i}`, "strain").filter(isValue).map((c) => c.value))
        .filter((xs) => xs.length)
        .map((xs) => Math.max(...xs));
      const m = mean(vs);
      return m === null ? null : Math.round(m);
    })
  };

  // ── Department table (last 7 days) ──
  const topCat = new Map<string, { cat: string; n: number }>();
  for (const c of input.cats ?? []) {
    const cur = topCat.get(c.unitId);
    if (c.n > 0 && (!cur || c.n > cur.n || (c.n === cur.n && c.cat < cur.cat))) topCat.set(c.unitId, { cat: c.cat, n: c.n });
  }
  const departments: DeptRow[] = input.units.map((u) => {
    const state = stateOf(u.id);
    if (state !== "visible") return { unitId: u.id, name: u.name, state };
    const r = radar.find((x) => x.unitId === u.id) as Extract<RadarEntry, { state: "visible" }>;
    const wk = bucket(WEEK, u.id, null)!;
    return {
      unitId: u.id,
      name: u.name,
      state,
      enrolled: enrolledOf(u.id),
      checkins: wk.checkins,
      mood: cellOf(pt(WEEK, u.id, null, "mood")),
      stress: cellOf(pt(WEEK, u.id, null, "stress")),
      missedBreaks: cellOf(pt(WEEK, u.id, null, "missed_breaks")),
      topRequest: topCat.get(u.id)?.cat ?? null,
      risk: r.score,
      level: r.level
    };
  });

  // ── Facility-wide mood/stress per window, pooled over units above the floor in that window ──
  const pooled = (win: string, field: "mood" | "stress"): number | null => {
    let sum = 0, n = 0, people = 0;
    for (const u of input.units) {
      const b = bucket(win, u.id, null);
      if (!b || b.checkinPeople < min) continue;
      people += b.checkinPeople;
      sum += field === "mood" ? b.moodSum : b.stressSum;
      n += field === "mood" ? b.moodN : b.stressN;
    }
    return people >= min && n > 0 ? clamp(scale5(sum / n)) : null;
  };
  const trendWins = Array.from({ length: 8 }, (_, i) => wins.get(`w${i}`)!);
  const trend = {
    weeks: trendWins.map((w) => w.from),
    mood: trendWins.map((w) => pooled(w.key, "mood")),
    stress: trendWins.map((w) => pooled(w.key, "stress"))
  };

  // ── KPIs ──
  const enrolledTotal = input.units.reduce((a, u) => a + enrolledOf(u.id), 0);
  const fw = bucket(WEEK, null, null);
  const checkedIn = fw?.checkinPeople ?? 0;
  const moodNow = pooled(WEEK, "mood"), moodBefore = pooled(PRIOR, "mood");
  const vis = radar.filter((r): r is Extract<RadarEntry, { state: "visible" }> => r.state === "visible");
  const kpis: Kpis = {
    participation:
      checkedIn >= min && enrolledTotal >= min
        ? { value: Math.min(100, Math.round((100 * checkedIn) / enrolledTotal)), checkedIn, enrolled: enrolledTotal }
        : { suppressed: true },
    mood: moodNow === null ? { suppressed: true } : { value: moodNow, delta: moodBefore === null ? null : moodNow - moodBefore },
    highAlert: { value: vis.filter((r) => r.level === "high" && r.support?.status !== "resolved").length, of: input.units.length },
    handled: input.handled && input.handled.people >= min ? { value: input.handled.n } : { suppressed: true },
    supportSent: { value: input.supportSent ?? 0 }
  };

  const noCheckins = !trendWins.some((w) => (bucket(w.key, null, null)?.checkins ?? 0) > 0);

  return { metric, range, asOf: today, noCheckins, hours: HOUR_LABELS, units, hourAvg, radar, surge, departments, trend, kpis };
}
