"use client";
import { useMemo, useState } from "react";
import { useDesktopToast } from "@/components/ui/Phone";
import { nowT } from "@/lib/time";

/**
 * Facility View shows unit level totals only. Never individual staff data.
 * TODO(IT): feed from an aggregation job that enforces a minimum group size (for example 10 or more people).
 */
const UNITS = ["ICU", "ED", "Med Surg", "Cardiology", "Peds", "Imaging", "Ortho", "L and D"];
const HOURS = ["7a", "9a", "11a", "1p", "3p", "5p", "7p", "9p", "11p", "1a", "3a", "5a"];
const METRICS = { strain: "Strain", stress: "Stress", breaks: "Missed breaks", requests: "HOP requests" } as const;
type Metric = keyof typeof METRICS;

function val(u: number, h: number, m: Metric) {
  const seed = (u + 1) * 31 + (h + 3) * 17 + m.length * 13;
  const base = Math.abs(Math.sin(seed)) * 60 + 20;
  const night = h >= 7 ? 12 : 0;
  const hot = u === 0 || u === 1 ? 14 : 0;
  return Math.min(99, Math.round(base * 0.7 + night + hot));
}
const color = (v: number) => (v >= 80 ? "#e8625a" : v >= 65 ? "#e8a93a" : v >= 45 ? "#4ea1e3" : "#04a6a8");

const RADAR0 = [
  { unit: "ICU nights", score: 86, trend: "+9", drivers: ["3 doubles this week", "Sleep down 14%", "Breaks missed 41%"] },
  { unit: "ED evenings", score: 79, trend: "+6", drivers: ["Surge Tuesday", "Stress up", "Requests up 22%"] },
  { unit: "L and D days", score: 64, trend: "+2", drivers: ["Two new hires", "Short staffed Friday"] },
  { unit: "Imaging", score: 48, trend: "-3", drivers: ["Steady"] }
];

export default function FacilityApp() {
  const [m, setM] = useState<Metric>("strain");
  const [sel, setSel] = useState<[number, number] | null>([0, 8]);
  const [radar, setRadar] = useState(RADAR0.map((r) => ({ ...r, status: "open" as "open" | "sent" | "resolved" })));
  const [log, setLog] = useState<[string, string][]>([]);
  const { toast, node } = useDesktopToast();
  const grid = useMemo(() => UNITS.map((_, u) => HOURS.map((_, h) => val(u, h, m))), [m]);
  const act = (i: number, s: "sent" | "resolved", text: string) => {
    setRadar(radar.map((r, j) => (j === i ? { ...r, status: s } : r)));
    setLog([[nowT(), text], ...log]);
    toast(text);
  };
  return (
    <section className="console on">
      {node}
      <div className="chead"><div><span className="tag n">Facility view</span><h1 className="disp" style={{ marginTop: 10 }}>See strain early. Act before burnout.</h1><p>Unit totals only. No names, no personal data.</p></div></div>
      <div className="kpis">
        <div className="kpi"><small>Units at high strain</small><b>{grid.filter((r) => Math.max(...r) >= 80).length}</b><span className="m">Next 12 hours</span></div>
        <div className="kpi"><small>Staff using HOP</small><b>412</b><span>Sample number</span></div>
        <div className="kpi"><small>Breaks protected</small><b>68%</b><span>Up 9 pts</span></div>
        <div className="kpi"><small>Burnout alerts</small><b>{radar.filter((r) => r.status === "open" && r.score >= 70).length}</b><span className="m">Need a plan</span></div>
      </div>
      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <h2 className="disp" style={{ fontSize: 20, color: "var(--navy)" }}>Unit heat map</h2>
          <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{(Object.keys(METRICS) as Metric[]).map((k) => <button key={k} className={`chip ${m === k ? "on" : ""}`} style={{ fontSize: 12, padding: "6px 11px" }} onClick={() => setM(k)}>{METRICS[k]}</button>)}</div>
        </div>
        <div className="dtwrap">
          <div className="hgrid" style={{ gridTemplateColumns: `110px repeat(${HOURS.length}, minmax(40px,1fr))`, minWidth: 640, marginTop: 14 }}>
            <div />
            {HOURS.map((h) => <div key={h} className="hlabel" style={{ justifyContent: "center", color: "var(--muted)" }}>{h}</div>)}
            {UNITS.map((u, ui) => [
              <div key={u} className="hlabel">{u}</div>,
              ...HOURS.map((_, hi) => (
                <div key={u + hi} className="hcell" title={`${u} ${HOURS[hi]}: ${grid[ui][hi]}`} style={{ background: color(grid[ui][hi]), outline: sel && sel[0] === ui && sel[1] === hi ? "3px solid #012f6c" : "none" }} onClick={() => setSel([ui, hi])}>
                  {grid[ui][hi]}
                </div>
              ))
            ])}
          </div>
        </div>
        {sel && (
          <p style={{ marginTop: 12, fontSize: 14 }}>
            <b>{UNITS[sel[0]]} at {HOURS[sel[1]]}:</b> {METRICS[m]} {grid[sel[0]][sel[1]]}. {grid[sel[0]][sel[1]] >= 80 ? "Suggest a Surge Shield: meal drop, rides home, and a float nurse." : "Within range."}
          </p>
        )}
      </div>
      <div className="panel">
        <h2 className="disp" style={{ fontSize: 20, color: "var(--navy)" }}>Burnout Radar</h2>
        <div className="dtwrap">
          <table className="dtab">
            <thead><tr><th>Team</th><th>Score</th><th>Trend</th><th>Drivers</th><th>Action</th></tr></thead>
            <tbody>
              {radar.map((r, i) => (
                <tr key={r.unit}>
                  <td><b>{r.unit}</b></td>
                  <td><span className={`st ${r.score >= 80 ? "matching" : r.score >= 60 ? "dispatched" : "verified"}`}>{r.score}</span></td>
                  <td>{r.trend}</td>
                  <td><small>{r.drivers.join(" · ")}</small></td>
                  <td>
                    {r.status === "open" && <button className="btn p" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => act(i, "sent", `Support sent to ${r.unit}`)}>Send support</button>}
                    {r.status === "sent" && <button className="btn o" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => act(i, "resolved", `${r.unit} marked resolved`)}>Resolve</button>}
                    {r.status === "resolved" && <span className="tag">Resolved ✓</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {log.length > 0 && <div className="tl" style={{ marginTop: 12 }}>{log.map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}</div>}
      </div>
    </section>
  );
}
