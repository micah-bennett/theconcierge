"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import { useDesktopToast } from "@hop/shared/ui/Phone";
import { MIN_GROUP_SIZE } from "@hop/shared/brand";
import type { Cell, Level, Metric, RadarEntry, Range } from "@/lib/server/aggregate";
import type { FacilityResponse } from "@/lib/server/facility";
import "../app/facility.css";

/**
 * Facility View: unit totals only. Never individual staff data. Everything below MIN_GROUP_SIZE
 * people arrives from the server as `{ suppressed: true }` with no number; this component only
 * draws it hatched. Ported from prototype/starter/components/facility/FacilityApp.tsx, with the
 * mockup's heat map, Burnout Radar, and lower panels.
 */

const METRIC_LABEL: Record<Metric, string> = { strain: "Overall strain", stress: "Stress", missed_breaks: "Missed breaks", requests: "HOP requests" };
const RANGE_LABEL: Record<Range, string> = { today: "Today", week: "This week", next: "Next week forecast" };
const PRIVACY = `Fewer than ${MIN_GROUP_SIZE} people, hidden for privacy`;

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

function stamp(iso: string) {
  const d = new Date(iso);
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return d.toDateString() === new Date().toDateString() ? t : `${d.toLocaleDateString("en-US", { weekday: "short" })} ${t}`;
}

// Sample content from the mockup (not from the database). Shown with "Sample" labels.
const SAMPLE_DEPT: Record<string, { morale: number; retention: number; top: string }> = {
  Emergency: { morale: 74, retention: 89, top: "Meals to the break room" },
  ICU: { morale: 71, retention: 87, top: "Rides home after nights" },
  Cardiology: { morale: 82, retention: 94, top: "Pharmacy pickups" },
  Oncology: { morale: 79, retention: 92, top: "Quiet room resets" },
  Pediatrics: { morale: 85, retention: 95, top: "School pickups" },
  "Home Health": { morale: 76, retention: 88, top: "Errands between visits" }
};

function LineChart() {
  const m = [58, 61, 64, 67, 71, 78], r = [84, 85, 86, 88, 89, 92], L = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  const W = 520, H = 190, px = (i: number) => 40 + (i * (W - 60)) / 5, py = (v: number) => H - 28 - ((v - 50) / 50) * (H - 50);
  const path = (a: number[]) => a.map((v, i) => `${i ? "L" : "M"}${px(i)} ${py(v)}`).join(" ");
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Morale and retention trend">
        {[60, 70, 80, 90, 100].map((v) => (
          <g key={v}>
            <line x1="40" x2={W - 20} y1={py(v)} y2={py(v)} stroke="#eef1f5" />
            <text x="32" y={py(v) + 4} fontSize="10" fill="#9aa5b8" textAnchor="end">{v}</text>
          </g>
        ))}
        <path d={path(r)} fill="none" stroke="#012f6c" strokeWidth="3" strokeLinecap="round" />
        <path d={path(m)} fill="none" stroke="#04a6a8" strokeWidth="3" strokeLinecap="round" />
        {r.map((v, i) => <circle key={`r${i}`} cx={px(i)} cy={py(v)} r="4" fill="#012f6c" />)}
        {m.map((v, i) => <circle key={`m${i}`} cx={px(i)} cy={py(v)} r="4" fill="#04a6a8" />)}
        {L.map((l, i) => <text key={l} x={px(i)} y={H - 8} fontSize="11" fill="#5d6b82" textAnchor="middle">{l}</text>)}
      </svg>
      <div className="row" style={{ gap: 16, fontSize: 12.5, color: "var(--muted)" }}>
        <span><b style={{ color: "#012f6c" }}>●</b> Retention %</span>
        <span><b style={{ color: "#04a6a8" }}>●</b> Morale index</span>
      </div>
    </>
  );
}

type Visible = Extract<RadarEntry, { suppressed: false }>;

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
  const [prestaged, setPrestaged] = useState(false);
  const [captured, setCaptured] = useState(false);
  const { toast, node } = useDesktopToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await j<FacilityResponse>(`/api/facility?metric=${metric}&range=${range}`);
      setData(d);
      setErr(null);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        window.location.href = "/login";
        return;
      }
      setErr(e instanceof Error ? e.message : "Couldn't load the facility view");
    } finally {
      setLoading(false);
    }
  }, [metric, range]);
  useEffect(() => {
    load();
  }, [load]);

  const units = data?.units ?? [];
  const hours = data?.hours ?? [];

  // Peak visible cell; also the default selection.
  const peak = useMemo(() => {
    let best: [number, number] | null = null, bv = -1;
    units.forEach((u, i) => {
      if (u.suppressed) return;
      u.cells.forEach((c, h) => {
        const v = val(c);
        if (v !== null && v > bv) { bv = v; best = [i, h]; }
      });
    });
    return best as [number, number] | null;
  }, [units]);
  const sel = cell ?? peak ?? [0, 0];
  const selUnit = units[sel[0]];
  const radarFor = (unitId: string | undefined) => data?.radar.find((r) => r.unitId === unitId);
  const selRadar = radarFor(selUnit?.id);

  const pickFor = (r: Visible) => picks[r.unitId] ?? r.defaultPick;
  const togglePick = (r: Visible, k: number) => {
    const cur = pickFor(r);
    setPicks({ ...picks, [r.unitId]: cur.includes(k) ? cur.filter((x) => x !== k) : [...cur, k] });
  };
  const bestHour = (i: number) => {
    const u = units[i];
    if (!u || u.suppressed) return 0;
    let bj = 0, bv = -1;
    u.cells.forEach((c, h) => { const v = val(c); if (v !== null && v > bv) { bv = v; bj = h; } });
    return bj;
  };
  const viewOnMap = (unitId: string) => {
    const i = units.findIndex((u) => u.id === unitId);
    if (i < 0) return;
    setCell([i, bestHour(i)]);
    document.querySelector(".hmwrap")?.scrollIntoView({ behavior: "smooth", block: "center" });
  };

  const send = async (r: Visible) => {
    let pick = pickFor(r);
    if (!pick.length) pick = [0];
    const actions = pick.map((k) => r.acts[k]).filter(Boolean);
    setBusy(r.unitId);
    try {
      await j("/api/facility?action=support", { method: "POST", body: JSON.stringify({ unitId: r.unitId, actions }) });
      toast(`Support sent to ${r.name}`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send support");
    } finally {
      setBusy(null);
    }
  };
  const resolve = async (r: Visible) => {
    setBusy(r.unitId);
    try {
      await j("/api/facility?action=resolve", { method: "POST", body: JSON.stringify({ unitId: r.unitId }) });
      toast(`${r.name} marked resolved`);
      await load();
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't update");
    } finally {
      setBusy(null);
    }
  };

  const radar = data?.radar ?? [];
  const vis = radar.filter((r): r is Visible => !r.suppressed);
  const isSent = (r: Visible) => !!r.support;
  const cnt = { all: radar.length, high: vis.filter((r) => r.level === "high").length, watch: vis.filter((r) => r.level === "watch").length, sent: vis.filter(isSent).length };
  const list = radar.filter((r) => {
    if (radarF === "all") return true;
    if (r.suppressed) return false;
    return radarF === "high" ? r.level === "high" : radarF === "watch" ? r.level === "watch" : isSent(r);
  });
  const highAlert = vis.filter((r) => r.level === "high" && r.support?.status !== "resolved").length;

  // ── Selected cell detail ──
  const selVal = selUnit && !selUnit.suppressed ? val(selUnit.cells[sel[1]]) : null;
  const rowVals = selUnit && !selUnit.suppressed ? selUnit.cells.map(val) : [];
  const rowKnown = rowVals.filter((v): v is number => v !== null);
  const rowAvg = rowKnown.length ? Math.round(rowKnown.reduce((a, b) => a + b, 0) / rowKnown.length) : null;
  const selSuppressed = !selUnit || selUnit.suppressed || (selUnit.cells[sel[1]] && "suppressed" in selUnit.cells[sel[1]]);

  const surge = data?.surge ?? { days: [], values: [] };

  const supportBlock = (r: Visible, compact: boolean) => {
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

  return (
    <section className="console on">
      {node}
      <div className="chead">
        <div>
          <span className="tag n">Facility view</span>
          <h1 className="disp" style={{ marginTop: 10 }}>See strain early. Act before it costs you people.</h1>
          <p>{facilityName}. Anonymized signals from the whole care team, unit totals only. No names, no personal data.</p>
        </div>
        <div className="row" style={{ gap: 8 }}>
          {/* Signals are seeded demo data until real feeds are connected (privacy/HIPAA review first). */}
          <span className="tag g">Sample data</span>
          <span className="tag">{facilityName}</span>
        </div>
      </div>

      {err && <p className="fv-err" role="alert">{err} <button className="btn o" style={{ padding: "4px 10px", fontSize: 12 }} onClick={load}>Try again</button></p>}

      <div className="kpis">
        <div className="kpi"><small>Units on high alert</small><b style={{ color: "#e8625a" }}>{data ? highAlert : "–"}</b><span className="m">Of {radar.length} units</span></div>
        <div className="kpi"><small>Staff hours returned</small><b>1,860</b><span className="m">Sample · this quarter</span></div>
        <div className="kpi"><small>Intent to stay</small><b>4.2 / 5</b><span className="m">Sample · up 0.6 from baseline</span></div>
        <div className="kpi"><small>Missed breaks covered</small><b>312</b><span className="m">Sample · meals sent to units</span></div>
      </div>

      {/* ── Heat map ── */}
      <div className={`panel ${loading ? "fv-loading" : ""}`}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 12, alignItems: "flex-start" }}>
          <div>
            <h2>Care team heat map</h2>
            <p className="ps" style={{ margin: 0 }}>
              {METRIC_LABEL[metric]} by unit and hour · {RANGE_LABEL[range]}{range === "next" ? " · forecast" : ""}{data?.asOf ? ` · signals through ${data.asOf}` : ""} · anonymized
            </p>
          </div>
          <div className="seg2" role="group" aria-label="Time range">
            {(Object.keys(RANGE_LABEL) as Range[]).map((k) => (
              <button key={k} className={range === k ? "on" : ""} onClick={() => setRange(k)}>{RANGE_LABEL[k]}</button>
            ))}
          </div>
        </div>
        <div className="subtabs" style={{ margin: "14px 0 0", padding: 0 }} role="group" aria-label="Metric">
          {(Object.keys(METRIC_LABEL) as Metric[]).map((k) => (
            <button key={k} className={metric === k ? "on" : ""} onClick={() => setMetric(k)}>{METRIC_LABEL[k]}</button>
          ))}
        </div>

        {data && units.length === 0 && <p className="ps" style={{ marginTop: 14 }}>No units are set up for this facility yet.</p>}
        {units.length > 0 && (
          <div className="hmwrap">
            <div>
              <div className="heat2">
                <div />
                {hours.map((h, j) => <div key={h} className={`h ${j === sel[1] ? "on" : ""}`}>{h}</div>)}
                {units.map((u, i) => [
                  <button key={u.id} className={`dn ${i === sel[0] ? "on" : ""} ${u.suppressed ? "supp" : ""}`} onClick={() => setCell([i, bestHour(i)])} title={u.suppressed ? PRIVACY : undefined}>
                    {u.name}{u.suppressed ? " 🔒" : ""}
                  </button>,
                  ...hours.map((h, j) => {
                    const c = u.suppressed ? ({ suppressed: true } as const) : u.cells[j];
                    const v = val(c);
                    const selected = i === sel[0] && j === sel[1];
                    const isPeak = peak && peak[0] === i && peak[1] === j;
                    if (v === null) {
                      const supp = "suppressed" in c;
                      return (
                        <button key={u.id + h} className={`c ${supp ? "supp" : "miss"} ${selected ? "sel" : ""}`} title={supp ? PRIVACY : "No data"} aria-label={`${u.name} ${h}: ${supp ? PRIVACY : "no data"}`} onClick={() => setCell([i, j])}>
                          {supp ? "" : "·"}
                        </button>
                      );
                    }
                    return (
                      <button key={u.id + h} className={`c ${selected ? "sel" : ""} ${isPeak ? "peak" : ""}`} style={{ background: heatCol(v), color: v >= 62 ? "#fff" : "#14213a" }} aria-label={`${u.name} ${h}: ${v}`} title={`${u.name} ${h}: ${v}`} onClick={() => setCell([i, j])}>
                        {v}
                      </button>
                    );
                  })
                ])}
                <div className="dn" style={{ color: "var(--muted)", fontWeight: 700 }}>All units</div>
                {(data?.hourAvg ?? []).map((x, j) => (
                  <div key={j} className="avg" style={{ borderTop: `3px solid ${x === null ? "#e6e9ee" : heatCol(x)}` }}>{x ?? "–"}</div>
                ))}
              </div>
              <div className="row fv-legend" style={{ gap: 6, marginTop: 12, fontSize: 11.5, color: "var(--muted)", flexWrap: "wrap" }}>
                0 {["#e3f5f5", "#a8dcdc", "#f6d58e", "#f2a65e", "#e8625a"].map((c) => <i key={c} style={{ background: c }} />)} 100
                <span style={{ marginLeft: 10 }}>◎ Peak</span>
                <span style={{ marginLeft: 10 }}><i className="supp" /> {PRIVACY}</span>
                <span style={{ marginLeft: 10 }}>Tap a unit name or a square</span>
              </div>
            </div>

            <div className={`hdetail ${selSuppressed ? "supp" : ""}`}>
              <small className="kick">{selUnit?.name} · {hours[sel[1]]}</small>
              {selSuppressed ? (
                <>
                  <div className="row" style={{ gap: 12, margin: "6px 0 4px" }}>
                    <b className="bignum">🔒</b>
                    <p style={{ fontSize: 13, color: "var(--muted)" }}>{PRIVACY}. HOP never shows numbers for groups this small, so no one can be identified.</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="row" style={{ gap: 12, margin: "6px 0 4px" }}>
                    <b className="bignum" style={{ color: selVal === null ? "var(--muted)" : LV[levelOf(selVal)][2] }}>{selVal ?? "–"}</b>
                    <div>
                      {selVal !== null && <span className={`tag ${LV[levelOf(selVal)][1]}`}>{LV[levelOf(selVal)][0]}</span>}
                      {selVal !== null && rowAvg !== null && (
                        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 4 }}>{selVal - rowAvg >= 0 ? "+" : ""}{selVal - rowAvg} vs this unit&apos;s daily average</p>
                      )}
                    </div>
                  </div>
                  <div className="spark">
                    {rowVals.map((x, j) => <i key={j} style={{ height: `${x ?? 0}%`, background: j === sel[1] && x !== null ? heatCol(x) : "#d5dde8" }} />)}
                  </div>
                  {selRadar && !selRadar.suppressed && (
                    <>
                      <p className="kick" style={{ marginTop: 12 }}>What is driving it</p>
                      <div className="moods" style={{ margin: "6px 0 12px" }}>{selRadar.drivers.map((d) => <span key={d} className="chip" style={{ cursor: "default" }}>{d}</span>)}</div>
                      {selRadar.acts.length === 0 ? (
                        <span className="tag">No action needed</span>
                      ) : (
                        <>
                          <p className="kick">Suggested support</p>
                          <ul className="acts">{pickFor(selRadar).map((k) => <li key={k}>{selRadar.acts[k]}</li>)}</ul>
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
          Overall strain blends stress signals (45%), missed breaks (35%), and request volume (20%) [CONFIRM weighting]. Units or hours with fewer than {MIN_GROUP_SIZE} people are hidden on the server, so no one can be identified. {range === "next" && "The forecast is this week's average adjusted by the last three days' direction [CONFIRM forecast model]."}
        </p>
      </div>

      {/* ── Burnout Radar ── */}
      <div className={`panel ${loading ? "fv-loading" : ""}`}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2>Burnout Radar</h2>
            <p className="ps" style={{ margin: 0 }}>Each unit gets a risk score from 0 to 100 from this week&apos;s strain signals. Pick the support and send it in one tap.</p>
          </div>
          <div className="subtabs" style={{ margin: 0, padding: 0 }}>
            {([["all", "All units"], ["high", "High"], ["watch", "Watch"], ["sent", "Support sent"]] as const).map(([k, l]) => (
              <button key={k} className={radarF === k ? "on" : ""} onClick={() => setRadarF(k)}>{l} · {cnt[k]}</button>
            ))}
          </div>
        </div>
        <div className="rgrid">
          {list.map((r) => {
            if (r.suppressed)
              return (
                <div key={r.unitId} className={`rcard supp ${r.unitId === selUnit?.id ? "focus" : ""}`}>
                  <div className="row between">
                    <b style={{ fontSize: 15, color: "var(--navy)" }}>{r.name}</b>
                    <b className="score" style={{ color: "var(--muted)" }}>🔒</b>
                  </div>
                  <div className="meter" />
                  <p style={{ fontSize: 13, color: "var(--muted)", margin: "10px 0 0" }}>{PRIVACY}.</p>
                </div>
              );
            const lv = LV[r.level];
            const pick = pickFor(r);
            const locked = r.support?.status === "sent";
            return (
              <div key={r.unitId} className={`rcard ${r.unitId === selUnit?.id ? "focus" : ""}`}>
                <div className="row between">
                  <div>
                    <b style={{ fontSize: 15, color: "var(--navy)" }}>{r.name}</b>
                    {r.staff !== null && <small style={{ display: "block", color: "var(--muted)", fontSize: 12 }}>{r.staff} staff</small>}
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <b className="score" style={{ color: lv[2] }}>{r.score}</b>
                    <small style={{ display: "block", fontSize: 11.5, fontWeight: 700, color: r.trend > 0 ? "#b23e36" : "#23824a" }}>
                      {r.trend > 0 ? "▲" : r.trend < 0 ? "▼" : "■"} {Math.abs(r.trend)} this week
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
                    {r.acts.length > 0 && (
                      <>
                        <p className="kick">Choose support</p>
                        <div className="moods" style={{ margin: "6px 0 10px" }}>
                          {r.acts.map((a, k) => (
                            <button key={a} className={`chip ${pick.includes(k) ? "on" : ""}`} style={{ fontSize: 12, padding: "6px 10px" }} disabled={locked} onClick={() => togglePick(r, k)}>
                              {pick.includes(k) ? "✓ " : ""}{a}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
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
          {data?.asOf && (
            <div className="it">
              <span className="tm" style={{ width: 80, fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{data.asOf.slice(5)}</span>
              <div className="grow" style={{ fontSize: 13 }}>Burnout Radar refreshed with the latest signals</div>
            </div>
          )}
        </div>
      </div>

      {/* ── Lower panels (mockup). Sample content except Surge Shield and the breakdown's Staff, Risk and live request columns. ── */}
      <div className="cgrid">
        <div className="panel">
          <h2>Where the data comes from</h2>
          <p className="ps">Staff choose what to connect in their app. Leaders only ever see totals. Sample figures: no watch, calendar or schedule data is collected until the privacy review is done.</p>
          {([["⌚", "Watches and health apps", "Sleep, heart rate, HRV, steps, stress", 61], ["📅", "Calendars", "Personal and work calendars", 74], ["🗓️", "Work schedules", "Shifts, overtime, doubles [CONFIRM source]", 88], ["💬", "Mood check ins", "Daily one tap check in", 57]] as const).map((d) => (
            <div key={d[1]} className="netrow">
              <div className="ico t">{d[0]}</div>
              <div className="grow"><b>{d[1]}</b><small>{d[2]}</small><div className="pbar"><i style={{ width: `${d[3]}%` }} /></div></div>
              <b style={{ fontFamily: "Montserrat", color: "var(--navy)" }}>{d[3]}%</b>
            </div>
          ))}
          <p className="note" style={{ marginTop: 12 }}>Percent of enrolled staff who have turned each source on. Anyone can turn a source off at any time.</p>
        </div>
        <div className="panel">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div><h2>Surge Shield</h2><p className="ps" style={{ margin: 0 }}>Last 14 days of care team strain, all visible units</p></div>
            {prestaged ? <span className="tag">Pre staging noted ✓</span> : (
              <button className="btn p" onClick={() => { setPrestaged(true); toast("Noted. Pre staging isn't sent to HOP yet"); }}>Pre stage support</button>
            )}
          </div>
          <div className="surge">{surge.values.map((v, i) => <i key={i} className={v !== null && v > 62 ? "hi" : ""} style={{ height: `${v ?? 0}%` }} title={v === null ? "No data" : `${surge.days[i]}: ${v}`} />)}</div>
          <div className="surge" style={{ height: "auto", margin: 0 }}>
            {surge.days.map((d) => <small key={d} style={{ fontSize: 10, color: "var(--muted)", textAlign: "center" }}>{new Date(d + "T12:00:00Z").toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" }).slice(0, 2)}</small>)}
          </div>
          <p className="note">High strain days are in coral. HOP lines up extra meals, rides, and childcare backup before they hit. [CONFIRM forecast data source] TODO(IT): pre staging should create a Console item.</p>
        </div>
      </div>

      <div className="cgrid">
        <div className="panel">
          <h2>Department breakdown</h2>
          <p className="ps">Staff and risk from unit signals; HOP requests are live counts from the last 7 days. Morale, retention and top request are sample data.</p>
          <div className="tbl-wrap">
            <table>
              <thead><tr><th>Department</th><th>Staff</th><th>Risk</th><th>HOP requests (7d)</th><th>Morale</th><th>Retention</th><th>Top request</th></tr></thead>
              <tbody>
                {units.map((u, i) => {
                  const r = radarFor(u.id);
                  const s = SAMPLE_DEPT[u.name];
                  if (u.suppressed || !r || r.suppressed)
                    return (
                      <tr key={u.id} title={PRIVACY}>
                        <td><b>{u.name}</b></td>
                        <td colSpan={6} style={{ color: "var(--muted)" }}>🔒 {PRIVACY}</td>
                      </tr>
                    );
                  const lv = LV[r.level];
                  const live = val(u.liveRequests7d);
                  return (
                    <tr key={u.id} style={{ cursor: "pointer" }} onClick={() => { setCell([i, bestHour(i)]); document.querySelector(".hmwrap")?.scrollIntoView({ behavior: "smooth", block: "center" }); }}>
                      <td><b>{u.name}</b></td>
                      <td>{u.staff ?? "–"}</td>
                      <td><span className={`tag ${lv[1]}`}>{r.score} {lv[0]}</span></td>
                      <td title={live === null ? PRIVACY : undefined}>{live ?? <span style={{ color: "var(--muted)" }}>🔒</span>}</td>
                      <td>{s?.morale ?? "–"}</td>
                      <td>{s ? `${s.retention}%` : "–"}</td>
                      <td style={{ color: "var(--muted)" }}>{s?.top ?? "–"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
        <div className="panel">
          <h2>Morale and retention</h2>
          <p className="ps">Since HOP launch · sample trend</p>
          <LineChart />
        </div>
      </div>

      <div className="cgrid">
        <div className="panel">
          <h2>Pilot measurement</h2>
          <p className="ps">Baseline vs day 90 for the pilot group · 1 is low, 5 is high · sample</p>
          {([["Intent to stay", 3.6, 4.2], ["Felt supported", 3.1, 4.1], ["Burnout (lower is better)", 3.9, 3.0]] as const).map((m) => (
            <div key={m[0]} style={{ marginBottom: 14 }}>
              <div className="row between"><b style={{ fontSize: 14 }}>{m[0]}</b><small style={{ color: "var(--muted)" }}>{m[1]} → <b style={{ color: "var(--navy)" }}>{m[2]}</b></small></div>
              <div className="pbar" style={{ background: "#eef1f5" }}><i style={{ width: `${(m[1] / 5) * 100}%`, background: "#b9c4d4" }} /></div>
              <div className="pbar"><i style={{ width: `${(m[2] / 5) * 100}%` }} /></div>
            </div>
          ))}
          {captured ? <span className="tag">Day 90 survey noted ✓</span> : (
            <button className="btn n" onClick={() => { setCaptured(true); toast("Noted. Surveys aren't wired up yet"); }}>Capture day 90 survey</button>
          )}
        </div>
        <div className="panel">
          <h2>What we measure</h2>
          <p className="ps">Agreed with the hospital before launch [CONFIRM]</p>
          <div className="list">
            {[["Retention and turnover", "12 month rolling"], ["Overtime and sick calls", "Per unit, per month"], ["Staff hours returned", "Logged on every request"], ["Staff sentiment", "Baseline, day 90, day 180"]].map((x) => (
              <div key={x[0]} className="it"><div className="grow"><b>{x[0]}</b><small>{x[1]}</small></div></div>
            ))}
          </div>
          <div className="note" style={{ marginTop: 12 }}>🔒 Leaders only see anonymized totals. HOP never shows who asked for what.</div>
        </div>
      </div>
      <p className="note">Unit signals are seeded sample data until real feeds are connected. Panels marked sample are illustrations, not real results.</p>
    </section>
  );
}
