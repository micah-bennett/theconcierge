"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import { useDesktopToast } from "@hop/shared/ui/Phone";
import { JOB_TYPES, MIN_GROUP_SIZE } from "@hop/shared/brand";
import type { Cell, DeptRow, Level, Metric, RadarEntry, Range, UnitView } from "@/lib/server/aggregate";
import type { FacilityResponse } from "@/lib/server/facility";
import "../app/facility.css";

/**
 * Facility View: unit totals only. Never individual staff data. Everything below MIN_GROUP_SIZE
 * people arrives from the server as `{ suppressed: true }` (or a unit with state "hidden") with no
 * number; this component only draws it hatched. All numbers are built from HOP Client check-ins
 * and HOP requests (lib/server/facility.ts). Refetches every 60 s so new check-ins show up.
 */

const METRIC_LABEL: Record<Metric, string> = { strain: "Overall strain", stress: "Stress", missed_breaks: "Missed breaks", requests: "HOP requests", mood: "Mood" };
const RANGE_LABEL: Record<Range, string> = { today: "Today", week: "Last 7 days", next: "Next 72 hours forecast" };
const PRIVACY = `Fewer than ${MIN_GROUP_SIZE} people, hidden for privacy`;
const NO_CHECKINS = "No check-ins yet this week";
const REFRESH_MS = 60_000;
const CAT_LABEL: Record<string, string> = Object.fromEntries(JOB_TYPES.map(([k, , l]) => [k, l]));

function heatCol(v: number) {
  if (v < 35) return "#e3f5f5";
  if (v < 50) return "#a8dcdc";
  if (v < 62) return "#f6d58e";
  if (v < 75) return "#f2a65e";
  return "#e8625a";
}
const LV: Record<Level, [string, string, string]> = { high: ["High", "c", "#e8625a"], watch: ["Watch", "g", "#e8a93a"], steady: ["Steady", "", "#04a6a8"] };
const levelOf = (v: number): Level => (v >= 75 ? "high" : v >= 55 ? "watch" : "steady");
const val = (c: Cell | undefined) => (c && "value" in c ? c.value : null);
/** Mood is "higher is better", so it's coloured and banded on 100 − mood. */
const riskOf = (metric: Metric, v: number) => (metric === "mood" ? 100 - v : v);

function stamp(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString("en-US", { weekday: "short" })} ${t}`;
}
const shortDate = (day: string) => new Date(day + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
const signed = (n: number) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n)}`;

/** 8-week facility mood and stress, 0–100. A week below the privacy floor is a gap in the line. */
function TrendChart({ weeks, mood, stress }: { weeks: string[]; mood: (number | null)[]; stress: (number | null)[] }) {
  const W = 520, H = 190, n = Math.max(1, weeks.length - 1);
  const px = (i: number) => 40 + (i * (W - 60)) / n, py = (v: number) => H - 28 - (v / 100) * (H - 50);
  const path = (a: (number | null)[]) => {
    let d = "", pen = false;
    a.forEach((v, i) => {
      if (v === null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${px(i)} ${py(v)} `;
      pen = true;
    });
    return d.trim();
  };
  const any = [...mood, ...stress].some((v) => v !== null);
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Weekly average mood and stress, last 8 weeks">
        {[0, 25, 50, 75, 100].map((v) => (
          <g key={v}>
            <line x1="40" x2={W - 20} y1={py(v)} y2={py(v)} stroke="#eef1f5" />
            <text x="32" y={py(v) + 4} fontSize="10" fill="#9aa5b8" textAnchor="end">{v}</text>
          </g>
        ))}
        <path d={path(stress)} fill="none" stroke="#e8625a" strokeWidth="3" strokeLinecap="round" />
        <path d={path(mood)} fill="none" stroke="#04a6a8" strokeWidth="3" strokeLinecap="round" />
        {stress.map((v, i) => v !== null && <circle key={`s${i}`} cx={px(i)} cy={py(v)} r="4" fill="#e8625a"><title>{`Week of ${shortDate(weeks[i])}: stress ${v}`}</title></circle>)}
        {mood.map((v, i) => v !== null && <circle key={`m${i}`} cx={px(i)} cy={py(v)} r="4" fill="#04a6a8"><title>{`Week of ${shortDate(weeks[i])}: mood ${v}`}</title></circle>)}
        {weeks.map((w, i) => <text key={w} x={px(i)} y={H - 8} fontSize="10.5" fill="#5d6b82" textAnchor="middle">{shortDate(w)}</text>)}
        {!any && <text x={W / 2} y={H / 2 - 10} fontSize="13" fill="#9aa5b8" textAnchor="middle">No weeks with {MIN_GROUP_SIZE} or more people yet</text>}
      </svg>
      <div className="row" style={{ gap: 16, fontSize: 12.5, color: "var(--muted)", flexWrap: "wrap" }}>
        <span><b style={{ color: "#04a6a8" }}>●</b> Mood (higher is better)</span>
        <span><b style={{ color: "#e8625a" }}>●</b> Stress</span>
        <span>Gaps are weeks with fewer than {MIN_GROUP_SIZE} people</span>
      </div>
    </>
  );
}

type Visible = Extract<RadarEntry, { state: "visible" }>;
type VisibleUnit = Extract<UnitView, { state: "visible" }>;
const Lock = () => <span aria-hidden>🔒</span>;

export default function FacilityApp({ facilityName }: { facilityName: string }) {
  const [metric, setMetric] = useState<Metric>("strain");
  const [range, setRange] = useState<Range>("today");
  const [data, setData] = useState<FacilityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [cell, setCell] = useState<[number, number] | null>(null);
  const [radarF, setRadarF] = useState<"all" | "high" | "watch" | "sent">("all");
  const [picks, setPicks] = useState<Record<string, number[]>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const { toast, node } = useDesktopToast();

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const d = await j<FacilityResponse>(`/api/facility?metric=${metric}&range=${range}`);
        setData(d);
        setErr(null);
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          window.location.href = "/login";
          return;
        }
        if (!silent) setErr(e instanceof Error ? e.message : "Couldn't load the facility view");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [metric, range]
  );
  useEffect(() => {
    load();
  }, [load]);

  // Refetch every 60 s (and when the tab comes back) so new check-ins appear without a reload.
  const loadRef = useRef(load);
  useEffect(() => {
    loadRef.current = load;
  }, [load]);
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") loadRef.current(true); }, REFRESH_MS);
    const onVis = () => { if (document.visibilityState === "visible") loadRef.current(true); };
    document.addEventListener("visibilitychange", onVis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  const units = useMemo(() => data?.units ?? [], [data]);
  const hours = data?.hours ?? [];

  // Peak visible cell (highest strain, or lowest mood); also the default selection.
  const peak = useMemo(() => {
    let best: [number, number] | null = null, bv = -1;
    units.forEach((u, i) => {
      if (u.state !== "visible") return;
      u.cells.forEach((c, h) => {
        const v = val(c);
        if (v !== null && riskOf(metric, v) > bv) { bv = riskOf(metric, v); best = [i, h]; }
      });
    });
    return best as [number, number] | null;
  }, [units, metric]);
  const sel = cell ?? peak ?? [0, 0];
  const selUnit = units[sel[0]];
  const radarFor = (unitId: string | undefined) => data?.radar.find((r) => r.unitId === unitId);
  const selRadar = radarFor(selUnit?.id);

  const pickFor = (r: RadarEntry) => picks[r.unitId] ?? r.defaultPick;
  const togglePick = (r: RadarEntry, k: number) => {
    const cur = pickFor(r);
    setPicks({ ...picks, [r.unitId]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  const bestHour = (i: number) => {
    const u = units[i];
    if (!u || u.state !== "visible") return 0;
    let bj = 0, bv = -1;
    u.cells.forEach((c, h) => { const v = val(c); if (v !== null && riskOf(metric, v) > bv) { bv = riskOf(metric, v); bj = h; } });
    return bj;
  };
  const viewOnMap = (unitId: string) => {
    const i = units.findIndex((u) => u.id === unitId);
    if (i < 0) return;
    setCell([i, bestHour(i)]);
    document.querySelector(".hmwrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const send = async (r: RadarEntry) => {
    let pick = pickFor(r);
    if (!pick.length) pick = [0];
    const actions = pick.map((k) => r.acts[k]).filter(Boolean);
    setBusy(r.unitId);
    try {
      await j("/api/facility?action=support", { method: "POST", body: JSON.stringify({ unitId: r.unitId, actions }) });
      toast(`Support sent to ${r.name}`);
      await load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send support");
    } finally {
      setBusy(null);
    }
  };
  const resolve = async (r: RadarEntry) => {
    setBusy(r.unitId);
    try {
      await j("/api/facility?action=resolve", { method: "POST", body: JSON.stringify({ unitId: r.unitId }) });
      toast(`${r.name} marked resolved`);
      await load(true);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  const radar = data?.radar ?? [];
  const vis = radar.filter((r): r is Visible => r.state === "visible");
  const isSent = (r: RadarEntry) => !!r.support;
  const cnt = { all: radar.length, high: vis.filter((r) => r.level === "high").length, watch: vis.filter((r) => r.level === "watch").length, sent: radar.filter(isSent).length };
  const list = radar.filter((r) => {
    if (radarF === "all") return true;
    if (radarF === "sent") return isSent(r);
    return r.state === "visible" && r.level === radarF;
  });

  // ── Selected cell detail ──
  const selVisible = selUnit?.state === "visible" ? (selUnit as VisibleUnit) : null;
  const selCell = selVisible?.cells[sel[1]];
  const selVal = val(selCell);
  const rowVals = selVisible ? selVisible.cells.map(val) : [];
  const rowKnown = rowVals.filter((v): v is number => v !== null);
  const rowAvg = rowKnown.length ? Math.round(rowKnown.reduce((a, b) => a + b, 0) / rowKnown.length) : null;
  const selHidden = !selVisible || (selCell && "suppressed" in selCell);

  const surge = data?.surge ?? { days: [], values: [] };
  const k = data?.kpis;

  const supportBlock = (r: RadarEntry, compact: boolean) => {
    const s = r.support;
    if (s?.status === "sent")
      return (
        <div className="row between" style={{ gap: 8, flexWrap: "wrap", marginTop: compact ? 0 : 10 }}>
          <span className="tag">Sent {stamp(s.at)} ✓{s.requestStatus === "dispatched" ? " · HOP on it" : s.requestStatus === "completed" ? " · Done by HOP" : ""}</span>
          <button className="btn o" style={{ padding: "6px 12px", fontSize: 12 }} disabled={busy === r.unitId} onClick={() => resolve(r)}>Mark resolved</button>
        </div>
      );
    if (s?.status === "resolved") return <span className="tag n" style={{ marginTop: compact ? 0 : 10 }}>Resolved ✓</span>;
    return null;
  };

  const choose = (r: RadarEntry) => {
    const pick = pickFor(r);
    const locked = r.support?.status === "sent";
    return (
      <div className="moods" style={{ margin: "6px 0 10px" }}>
        {r.acts.map((a, i) => (
          <button key={a} className={`chip ${pick.includes(i) ? "on" : ""}`} style={{ fontSize: 12, padding: "6px 10px" }} disabled={locked} onClick={() => togglePick(r, i)}>
            {pick.includes(i) ? "✓ " : ""}{a}
          </button>
        ))}
      </div>
    );
  };

  const kpiHidden = <><b style={{ color: "var(--muted)" }}><Lock /></b><span className="m">{PRIVACY}</span></>;
  const updated = data?.updatedAt ? new Date(data.updatedAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : null;

  return (
    <section className="console on">
      {node}
      <div className="chead">
        <div>
          <span className="tag n">Facility view</span>
          <h1 className="disp" style={{ marginTop: 10 }}>See strain early. Act before it costs you people.</h1>
          <p>{facilityName}. Built from your care team&apos;s HOP Client check-ins and HOP requests. Unit totals only. No names, no personal data.</p>
        </div>
        <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
          {updated && <span className="tag" title="Refreshes every minute">Updated {updated}</span>}
          <span className="tag">{facilityName}</span>
        </div>
      </div>

      {err && <p className="fv-err" role="alert">{err} <button className="btn o" style={{ padding: "4px 10px", fontSize: 12 }} onClick={() => load()}>Try again</button></p>}

      {data?.noCheckins && (
        <div className="panel fv-empty">
          <h2>No check-ins yet</h2>
          <p className="ps" style={{ margin: 0 }}>
            Staff check in once a day in HOP Client: how their mood and stress are, and whether they got a break. As soon as {MIN_GROUP_SIZE} or more
            people on a unit have checked in, that unit&apos;s totals show up here, and this page updates on its own every minute. Units with fewer
            than {MIN_GROUP_SIZE} people stay hidden, and no one is ever shown individually. You can still send support to any unit below.
          </p>
        </div>
      )}

      <div className="kpis">
        <div className="kpi">
          <small>Check-in participation</small>
          {!k ? <b>–</b> : "value" in k.participation ? (
            <><b>{k.participation.value}%</b><span className="m">{k.participation.checkedIn} of {k.participation.enrolled} enrolled staff · last 7 days</span></>
          ) : kpiHidden}
        </div>
        <div className="kpi">
          <small>Average mood</small>
          {!k ? <b>–</b> : "value" in k.mood ? (
            <>
              <b>{k.mood.value}<span style={{ fontSize: 15, color: "var(--muted)", fontWeight: 600 }}> / 100</span></b>
              {k.mood.delta === null ? <span className="m">Last 7 days</span> : (
                <span style={{ color: k.mood.delta < 0 ? "#b23e36" : "#23824a" }}>{signed(k.mood.delta)} vs the week before</span>
              )}
            </>
          ) : kpiHidden}
        </div>
        <div className="kpi">
          <small>Units on high alert</small>
          <b style={{ color: k && k.highAlert.value > 0 ? "#e8625a" : undefined }}>{k ? k.highAlert.value : "–"}</b>
          <span className="m">Of {k?.highAlert.of ?? radar.length} units</span>
        </div>
        <div className="kpi">
          <small>HOP requests handled</small>
          {!k ? <b>–</b> : "value" in k.handled ? <b>{k.handled.value}</b> : <b style={{ color: "var(--muted)" }}><Lock /></b>}
          <span className="m">Last 7 days · {k?.supportSent.value ?? 0} support action{k?.supportSent.value === 1 ? "" : "s"} sent{k && !("value" in k.handled) ? ` · requests hidden under ${MIN_GROUP_SIZE} people` : ""}</span>
        </div>
      </div>

      {/* ── Heat map ── */}
      <div className={`panel ${loading ? "fv-loading" : ""}`}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2>Care team heat map</h2>
            <p className="ps" style={{ margin: 0 }}>
              {METRIC_LABEL[metric]} by unit and two-hour slot · {RANGE_LABEL[range]}{data?.asOf ? ` · today is ${shortDate(data.asOf)} (ET)` : ""} · anonymized
            </p>
          </div>
          <div className="seg2" role="group" aria-label="Time range">
            {(Object.keys(RANGE_LABEL) as Range[]).map((r) => (
              <button key={r} className={range === r ? "on" : ""} onClick={() => setRange(r)}>{RANGE_LABEL[r]}</button>
            ))}
          </div>
        </div>
        <div className="subtabs" style={{ margin: "14px 0 0", padding: 0 }} role="group" aria-label="Metric">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((m) => (
            <button key={m} className={metric === m ? "on" : ""} onClick={() => setMetric(m)}>{METRIC_LABEL[m]}</button>
          ))}
        </div>

        {data && units.length === 0 && <p className="ps" style={{ marginTop: 14 }}>No units are set up for this facility yet.</p>}
        {units.length > 0 && (
          <div className="hmwrap">
            <div>
              <div className="heat2">
                <div />
                {hours.map((h, jx) => <div key={h} className={`h ${jx === sel[1] ? "on" : ""}`}>{h}</div>)}
                {units.map((u, i) => {
                  const nameBtn = (
                    <button key={u.id} className={`dn ${i === sel[0] ? "on" : ""} ${u.state !== "visible" ? "supp" : ""}`} onClick={() => setCell([i, bestHour(i)])} title={u.state === "hidden" ? PRIVACY : u.state === "empty" ? NO_CHECKINS : undefined}>
                      {u.name}{u.state === "hidden" ? " 🔒" : ""}
                    </button>
                  );
                  if (u.state === "empty")
                    return [nameBtn, <button key={u.id + "e"} className={`c empty ${i === sel[0] ? "sel" : ""}`} onClick={() => setCell([i, 0])}>{NO_CHECKINS}</button>];
                  if (u.state !== "visible")
                    return [nameBtn, <button key={u.id + "h"} className={`c supp wide ${i === sel[0] ? "sel" : ""}`} title={PRIVACY} onClick={() => setCell([i, 0])}>{PRIVACY}</button>];
                  const vu: VisibleUnit = u;
                  return [
                    nameBtn,
                    ...hours.map((h, jx) => {
                      const c = vu.cells[jx];
                      const v = val(c);
                      const selected = i === sel[0] && jx === sel[1];
                      const isPeak = peak && peak[0] === i && peak[1] === jx;
                      if (v === null) {
                        const supp = "suppressed" in c;
                        return (
                          <button key={u.id + h} className={`c ${supp ? "supp" : "miss"} ${selected ? "sel" : ""}`} title={supp ? PRIVACY : "No check-ins in this slot"} aria-label={`${u.name} ${h}: ${supp ? PRIVACY : "no check-ins"}`} onClick={() => setCell([i, jx])}>
                            {supp ? "" : "·"}
                          </button>
                        );
                      }
                      const rv = riskOf(metric, v);
                      return (
                        <button key={u.id + h} className={`c ${selected ? "sel" : ""} ${isPeak ? "peak" : ""}`} style={{ background: heatCol(rv), color: rv >= 62 ? "#fff" : "#14213a" }} aria-label={`${u.name} ${h}: ${v}`} title={`${u.name} ${h}: ${v}`} onClick={() => setCell([i, jx])}>
                          {v}
                        </button>
                      );
                    })
                  ];
                })}
                <div className="dn" style={{ color: "var(--muted)", fontWeight: 700 }}>All units</div>
                {(data?.hourAvg ?? []).map((x, jx) => (
                  <div key={jx} className="avg" style={{ borderTop: `3px solid ${x === null ? "#e6e9ee" : heatCol(riskOf(metric, x))}` }}>{x ?? "–"}</div>
                ))}
              </div>
              <div className="row fv-legend" style={{ gap: 6, marginTop: 12, fontSize: 11.5, color: "var(--muted)", flexWrap: "wrap" }}>
                {metric === "mood" ? "Low mood" : "0"} {["#e3f5f5", "#a8dcdc", "#f6d58e", "#f2a65e", "#e8625a"].map((c) => <i key={c} style={{ background: c }} />)} {metric === "mood" ? "" : "100"}
                {metric === "mood" && <span>coral = low mood</span>}
                <span style={{ marginLeft: 10 }}>◎ {metric === "mood" ? "Lowest" : "Peak"}</span>
                <span style={{ marginLeft: 10 }}><i className="supp" /> {PRIVACY}</span>
                <span style={{ marginLeft: 10 }}>· No check-ins in that slot</span>
                <span style={{ marginLeft: 10 }}>Tap a unit name or a square</span>
              </div>
            </div>

            <div className={`hdetail ${selHidden ? "supp" : ""}`}>
              <small className="kick">{selUnit?.name}{selVisible ? ` · ${hours[sel[1]]}` : ""}</small>
              {selHidden ? (
                <>
                  <div className="row" style={{ gap: 12, margin: "6px 0 4px" }}>
                    <b className="bignum">{selUnit?.state === "empty" ? "–" : <Lock />}</b>
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>
                      {selUnit?.state === "empty"
                        ? `${NO_CHECKINS}. Numbers appear once ${MIN_GROUP_SIZE} or more people on this unit check in in HOP Client.`
                        : `${PRIVACY}. HOP never shows numbers for groups this small, so no one can be identified.`}
                    </p>
                  </div>
                  {selRadar && selRadar.state !== "visible" && (
                    <>
                      <p className="kick" style={{ marginTop: 12 }}>Send support anyway</p>
                      {choose(selRadar)}
                      {supportBlock(selRadar, false) ?? (
                        <button className="btn n w" disabled={busy === selRadar.unitId} onClick={() => send(selRadar)}>
                          {busy === selRadar.unitId ? "Sending…" : `Send support to ${selRadar.name}`}
                        </button>
                      )}
                    </>
                  )}
                </>
              ) : (
                <>
                  <div className="row" style={{ gap: 12, margin: "6px 0 4px" }}>
                    <b className="bignum" style={{ color: selVal === null ? "var(--muted)" : LV[levelOf(riskOf(metric, selVal))][2] }}>{selVal ?? "–"}</b>
                    <div>
                      {selVal !== null && <span className={`tag ${LV[levelOf(riskOf(metric, selVal))][1]}`}>{LV[levelOf(riskOf(metric, selVal))][0]}</span>}
                      {selVal === null && <p style={{ fontSize: 12.5, color: "var(--muted)" }}>No check-ins in this slot</p>}
                      {selVal !== null && rowAvg !== null && (
                        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{selVal - rowAvg >= 0 ? "+" : ""}{selVal - rowAvg} vs this unit&apos;s average across the day</p>
                      )}
                    </div>
                  </div>
                  <div className="spark">
                    {rowVals.map((x, jx) => <i key={jx} style={{ height: `${x ?? 0}%`, background: jx === sel[1] && x !== null ? heatCol(riskOf(metric, x)) : "#d5dde8" }} />)}
                  </div>
                  {selRadar && selRadar.state === "visible" && (
                    <>
                      <p className="kick" style={{ marginTop: 12 }}>What is driving it</p>
                      <div className="moods" style={{ margin: "6px 0 12px" }}>
                        {selRadar.drivers.length ? selRadar.drivers.map((d) => <span key={d} className="chip" style={{ cursor: "default" }}>{d}</span>) : <span style={{ fontSize: 12.5, color: "var(--muted)" }}>Not enough check-ins to compare with last week yet</span>}
                      </div>
                      {selRadar.acts.length === 0 ? (
                        <span className="tag">No action needed</span>
                      ) : (
                        <>
                          <p className="kick">Suggested support</p>
                          <ul className="acts">{pickFor(selRadar).map((x) => <li key={x}>{selRadar.acts[x]}</li>)}</ul>
                          {supportBlock(selRadar, false) ?? (
                            <button className="btn n w" style={{ marginTop: 10 }} disabled={busy === selRadar.unitId} onClick={() => send(selRadar)}>
                              {busy === selRadar.unitId ? "Sending…" : `Send support to ${selRadar.name}`}
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        <p className="note" style={{ marginTop: 14 }}>
          Stress and mood are the average 1 to 5 check-in answer shown on a 0 to 100 scale (higher mood is better). Missed breaks is the share of daily
          check-ins that said no break. HOP requests are scaled to the unit&apos;s size: one request for every 10 enrolled staff in a two-hour slot is 100
          [CONFIRM scale]. Overall strain blends stress (45%), missed breaks (35%) and requests (20%) [CONFIRM weighting]. Any unit or slot with fewer than{" "}
          {MIN_GROUP_SIZE} people is hidden on the server. Times are Eastern; the 10p+ column runs overnight to 6a.
          {range === "next" && " The forecast is the last 7 days' average, adjusted by the last three days' direction [CONFIRM forecast model]."}
        </p>
      </div>

      {/* ── Burnout Radar ── */}
      <div className={`panel ${loading ? "fv-loading" : ""}`}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Burnout Radar</h2>
            <p className="ps" style={{ margin: 0 }}>Each unit gets a risk score from 0 to 100 from the last 7 days of strain. Pick the support and send it in one tap.</p>
          </div>
          <div className="subtabs" style={{ margin: 0, padding: 0 }}>
            {([["all", "All units"], ["high", "High"], ["watch", "Watch"], ["sent", "Support sent"]] as const).map(([f, l]) => (
              <button key={f} className={radarF === f ? "on" : ""} onClick={() => setRadarF(f)}>{l} · {cnt[f]}</button>
            ))}
          </div>
        </div>
        <div className="rgrid">
          {list.map((r) => {
            if (r.state !== "visible")
              return (
                <div key={r.unitId} className={`rcard supp ${r.unitId === selUnit?.id ? "focus" : ""}`}>
                  <div className="row between">
                    <b style={{ fontSize: 15, color: "var(--navy)" }}>{r.name}</b>
                    <b className="score" style={{ color: "var(--muted)" }}>{r.state === "hidden" ? <Lock /> : "–"}</b>
                  </div>
                  <div className="meter" />
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 8px" }}>{r.state === "hidden" ? `${PRIVACY}.` : `${NO_CHECKINS}.`}</p>
                  <p className="kick">Send support anyway</p>
                  {choose(r)}
                  {supportBlock(r, true) ?? (
                    <button className="btn n" style={{ padding: "8px 14px", fontSize: 12.5 }} disabled={busy === r.unitId} onClick={() => send(r)}>{busy === r.unitId ? "Sending…" : "Send support"}</button>
                  )}
                </div>
              );
            const lv = LV[r.level];
            return (
              <div key={r.unitId} className={`rcard ${r.unitId === selUnit?.id ? "focus" : ""}`}>
                <div className="row between">
                  <div>
                    <b style={{ fontSize: 15, color: "var(--navy)" }}>{r.name}</b>
                    <small style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{r.staff} enrolled</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <b className="score" style={{ color: lv[2] }}>{r.score}</b>
                    <small style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: r.trend > 0 ? "#b23e36" : "#23824a" }}>
                      {r.trend > 0 ? "▲" : r.trend < 0 ? "▼" : "■"} {Math.abs(r.trend)} vs last week
                    </small>
                  </div>
                </div>
                <div className="meter"><i style={{ width: `${r.score}%`, background: lv[2] }} /></div>
                <p style={{ fontSize: 13, color: "var(--ink)", margin: "10px 0 8px" }}>{r.signal}</p>
                <div className="moods" style={{ margin: "0 0 10px" }}>
                  {r.drivers.map((d) => <span key={d} className="chip" style={{ cursor: "default", fontSize: 12, padding: "5px 10px" }}>{d}</span>)}
                </div>
                {r.acts.length === 0 && !r.support ? (
                  <span className="tag">No action needed</span>
                ) : (
                  <>
                    {r.acts.length > 0 && (<><p className="kick">Choose support</p>{choose(r)}</>)}
                    {supportBlock(r, true) ?? (
                      <div className="row" style={{ gap: 8 }}>
                        <button className="btn n" style={{ padding: "8px 14px", fontSize: 12.5 }} disabled={busy === r.unitId} onClick={() => send(r)}>{busy === r.unitId ? "Sending…" : "Send support"}</button>
                        <button className="btn o" style={{ padding: "8px 12px", fontSize: 12.5 }} onClick={() => viewOnMap(r.unitId)}>See on heat map</button>
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
          {list.length === 0 && <p className="ps">Nothing here yet.</p>}
        </div>
        <p className="kick" style={{ marginTop: 6 }}>Action log</p>
        <div className="list rlog">
          {(data?.log ?? []).slice(0, 6).map((l, i) => (
            <div key={i} className="it">
              <span className="tm" style={{ width: 80, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{stamp(l.at)}</span>
              <div className="grow" style={{ fontSize: 13 }}>{l.text}</div>
            </div>
          ))}
          {data && data.log.length === 0 && <p className="ps" style={{ margin: "6px 0 0" }}>No support sent yet.</p>}
        </div>
      </div>

      <div className="cgrid">
        <div className="panel">
          <h2>Department breakdown</h2>
          <p className="ps">Last 7 days, per unit. Mood and stress are 0 to 100. Units with fewer than {MIN_GROUP_SIZE} people who checked in are hidden.</p>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Department</th><th>Enrolled</th><th>Check-ins</th><th>Mood</th><th>Stress</th><th>Missed breaks</th><th>Top request</th><th>Risk</th></tr></thead>
              <tbody>
                {(data?.departments ?? []).map((d: DeptRow) => {
                  const i = units.findIndex((u) => u.id === d.unitId);
                  if (d.state !== "visible")
                    return (
                      <tr key={d.unitId} title={d.state === "hidden" ? PRIVACY : NO_CHECKINS}>
                        <td><b>{d.name}</b></td>
                        <td colSpan={7} style={{ color: "var(--muted)" }}>{d.state === "hidden" ? <><Lock /> {PRIVACY}</> : NO_CHECKINS}</td>
                      </tr>
                    );
                  const lv = LV[d.level];
                  const show = (c: Cell, suffix = "") => (val(c) === null ? <span style={{ color: "var(--muted)" }}>–</span> : `${val(c)}${suffix}`);
                  return (
                    <tr key={d.unitId} style={{ cursor: "pointer" }} onClick={() => { setCell([i, bestHour(i)]); document.querySelector(".hmwrap")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                      <td><b>{d.name}</b></td>
                      <td>{d.enrolled}</td>
                      <td>{d.checkins}</td>
                      <td>{show(d.mood)}</td>
                      <td>{show(d.stress)}</td>
                      <td>{show(d.missedBreaks, "%")}</td>
                      <td style={{ color: "var(--muted)" }}>{d.topRequest ? CAT_LABEL[d.topRequest] ?? d.topRequest : "None yet"}</td>
                      <td><span className={`tag ${lv[1]}`}>{d.risk} {lv[0]}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h2>Mood and stress</h2>
          <p className="ps">Facility average, last 8 weeks · from HOP Client check-ins</p>
          {data && <TrendChart weeks={data.trend.weeks} mood={data.trend.mood} stress={data.trend.stress} />}
        </div>
      </div>

      <div className="cgrid">
        <div className="panel">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div><h2>Surge Shield</h2><p className="ps" style={{ margin: 0 }}>Last 14 days: each day&apos;s peak two-hour strain, averaged over visible units</p></div>
            <span className="tag g" title="TODO(IT): pre staging should create a Console item">Pre staging coming soon</span>
          </div>
          <div className="surge">{surge.values.map((v, i) => <i key={i} className={v !== null && v > 62 ? "hi" : ""} style={{ height: `${v ?? 0}%` }} title={v === null ? `${surge.days[i]}: not enough check-ins` : `${surge.days[i]}: ${v}`} />)}</div>
          <div className="surge" style={{ height: "auto", margin: 0 }}>
            {surge.days.map((d) => <small key={d} style={{ fontSize: 10, color: "var(--muted)", textAlign: "center" }}>{new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).slice(0, 2)}</small>)}
          </div>
          <p className="note">High strain days are in coral. A day only shows when a two-hour slot had {MIN_GROUP_SIZE} or more people check in.</p>
        </div>
        <div className="panel">
          <h2>How this works</h2>
          <p className="ps" style={{ margin: 0 }}>
            Built from HOP Client check-ins and requests. Units with fewer than {MIN_GROUP_SIZE} people are hidden. Individuals are never shown.
            Staff who turn off &quot;Share anonymized totals with my hospital&quot; are left out of every number.
          </p>
        </div>
      </div>
    </section>
  );
}
