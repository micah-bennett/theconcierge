"use client";
import { useEffect, useState } from "react";
import { useDesktopToast } from "@/components/ui/Phone";
import { statusPill } from "@/components/ui/StatusSteps";
import { JOB_TYPES, REPS } from "@/lib/brand";
import { api, useJobs } from "@/lib/client";
import { nowT, nowTA } from "@/lib/time";
import type { Job, StaffRequest } from "@/lib/types";

const repName = (id: string) => REPS.find((r) => r.id === id)?.first ?? "Unassigned";

export default function ConsoleApp() {
  const { jobs, online, update, refresh } = useJobs(undefined);
  const { toast, node } = useDesktopToast();
  const [reqs, setReqs] = useState<StaffRequest[]>([]);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState<Partial<StaffRequest> | null>(null);

  useEffect(() => {
    const load = () => api.requests().then(setReqs).catch(() => {});
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, []);

  const list = jobs.filter((j) => filter === "all" || j.rep === filter);
  const active = (id: string) => jobs.filter((j) => j.rep === id && !["completed", "declined"].includes(j.status)).length;
  const newReqs = reqs.filter((r) => r.status === "new");

  return (
    <section className="console on">
      {node}
      <div className="chead">
        <div>
          <span className="tag n">Concierge console</span>
          <h1 className="disp" style={{ marginTop: 10 }}>Every staff request, one operator view</h1>
          <p>Staff requests land here. Dispatch trips and tasks straight to one rep, and watch updates come back.</p>
        </div>
      </div>

      <div className="kpis">
        <div className="kpi"><small>New staff requests</small><b>{newReqs.length}</b><span className="m">Waiting for dispatch</span></div>
        <div className="kpi"><small>Active jobs</small><b>{jobs.filter((j) => !["completed", "declined"].includes(j.status)).length}</b><span>Across all reps</span></div>
        <div className="kpi"><small>Needs attention</small><b>{jobs.filter((j) => j.attn).length}</b><span className="m">Flagged by reps</span></div>
        <div className="kpi"><small>Completed</small><b>{jobs.filter((j) => j.status === "completed").length}</b><span>With proof</span></div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <h2 className="disp" style={{ fontSize: 20, color: "var(--navy)" }}>Staff request queue</h2>
        <p style={{ color: "var(--muted)", fontSize: 13.5 }}>From the Staff App. Turn any request into a job for a rep.</p>
        <div className="dtwrap">
          <table className="dtab">
            <thead><tr><th>Member</th><th>Request</th><th>Type</th><th>Status</th><th /></tr></thead>
            <tbody>
              {reqs.map((r) => (
                <tr key={r.id}>
                  <td><b>{r.member}</b><br /><small style={{ color: "var(--muted)" }}>{r.role}</small></td>
                  <td>{r.text}</td>
                  <td>{JOB_TYPES.find((t) => t[0] === r.cat)?.[2]}</td>
                  <td><span className={`st ${r.status === "new" ? "matching" : "verified"}`}>{r.status === "new" ? "New" : "Dispatched"}</span></td>
                  <td>{r.status === "new" && <button className="btn p" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => setCompose(r)}>Dispatch</button>}</td>
                </tr>
              ))}
              {!reqs.length && <tr><td colSpan={5} style={{ color: "var(--muted)" }}>No staff requests yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="panel">
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="disp" style={{ fontSize: 20, color: "var(--navy)" }}>Dispatch to reps</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Only the rep you pick sees the job. Their updates come back here.</p>
          </div>
          <button className="btn p" onClick={() => setCompose({})}>+ New trip or request</button>
        </div>
        <div className="row" style={{ gap: 8, margin: "14px 0 6px", flexWrap: "wrap" }}>
          <span className={`tag ${online ? "s" : "g"}`}>{online ? "● Live · connected to rep app" : "Connecting..."}</span>
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")} style={{ fontSize: 12, padding: "6px 11px" }}>All reps</button>
          {REPS.map((r) => (
            <button key={r.id} className={`chip ${filter === r.id ? "on" : ""}`} onClick={() => setFilter(r.id)} style={{ fontSize: 12, padding: "6px 11px" }}>{r.name} · {active(r.id)} active</button>
          ))}
        </div>
        <div className="dtwrap">
          <table className="dtab">
            <thead><tr><th>Sent</th><th>Rep</th><th>Request</th><th>Client</th><th>Status</th><th>Proof</th><th>Latest update</th><th /></tr></thead>
            <tbody>
              {list.map((j) => {
                const [label, cls] = statusPill(j);
                const last = [...j.log, ...j.updates].at(-1);
                return [
                  <tr key={j.id} className={open === j.id ? "sel" : ""}>
                    <td>{j.sentAt}</td>
                    <td><b>{repName(j.rep)}</b></td>
                    <td>{j.icon} {j.title}<br /><small style={{ color: "var(--muted)" }}>{j.window}</small></td>
                    <td>{j.client}</td>
                    <td><span className={`st ${cls}`}>{label}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>📷 {j.photos.length} {j.sig ? "✍️" : ""}</td>
                    <td><small>{last ? `${last[0]} · ${last[1]}` : "No updates yet"}</small></td>
                    <td><button className="btn o" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setOpen(open === j.id ? null : j.id)}>{open === j.id ? "Close" : "Details"}</button></td>
                  </tr>,
                  open === j.id && <JobDetails key={j.id + "-d"} j={j} onReassign={(to) => { update(j.id, { rep: to, status: "offer", attn: null, log: [...j.log, [nowT(), "Reassigned to " + repName(to)]] }); toast(`Sent to ${repName(to)}. Only ${repName(to)} can see it now.`); }} />
                ];
              })}
            </tbody>
          </table>
        </div>
      </div>

      {compose && (
        <Composer
          prefill={compose}
          onClose={() => setCompose(null)}
          onSent={(j) => { setCompose(null); refresh(); api.requests().then(setReqs).catch(() => {}); toast(`Sent to ${repName(j.rep)}. Only ${repName(j.rep)} can see it.`); }}
          onError={toast}
        />
      )}
    </section>
  );
}

function JobDetails({ j, onReassign }: { j: Job; onReassign: (rep: string) => void }) {
  const [to, setTo] = useState(j.rep);
  return (
    <tr className="dexp">
      <td colSpan={8}>
        <div className="dgrid">
          <div>
            <p className="kick">Timeline</p>
            <div className="tl" style={{ marginTop: 6 }}>
              <div><small /> Sent to {repName(j.rep)} at {j.sentAt}</div>
              {[...j.log.map(([t, x]) => [t, "Status: " + x]), ...j.updates].map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}
            </div>
            {j.attn && <div className="instr" style={{ marginTop: 10 }}><b>⚠️ {j.attn.r}</b><p>{j.attn.n}</p></div>}
            {j.notesList.length > 0 && <><p className="kick" style={{ marginTop: 10 }}>Rep notes</p>{j.notesList.map((n, i) => <p key={i} style={{ fontSize: 13 }}>• {n}</p>)}</>}
          </div>
          <div>
            <p className="kick">Proof of completion</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {j.photos.length ? <div className="thumbs">{j.photos.map((p, i) => <img key={i} src={p} alt="Proof photo" />)}</div> : <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>No photo yet</p>}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {j.sig ? <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, marginTop: 8, padding: 6 }}><img src={j.sig} alt="Signature" style={{ width: "100%", height: 80, objectFit: "contain" }} /><small style={{ fontSize: 11.5, color: "var(--muted)" }}>Signed by {j.signedBy}</small></div> : <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>No signature yet</p>}
            <p className="kick" style={{ marginTop: 12 }}>Reassign</p>
            <div className="row" style={{ gap: 6, marginTop: 6 }}>
              <select className="field" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8 }}>{REPS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
              <button className="btn n" style={{ padding: "8px 12px" }} onClick={() => onReassign(to)}>Send</button>
            </div>
            <div className="row" style={{ gap: 6, marginTop: 10 }}>
              {j.phone && <a className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} href={`tel:${j.phone}`}>📞 Client</a>}
              {j.vendor?.phone && <a className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} href={`tel:${j.vendor.phone}`}>📞 Vendor</a>}
            </div>
          </div>
        </div>
      </td>
    </tr>
  );
}

function Composer({ prefill, onClose, onSent, onError }: { prefill: Partial<StaffRequest>; onClose: () => void; onSent: (j: Job) => void; onError: (m: string) => void }) {
  const [type, setType] = useState<string>(prefill.cat ?? "ride");
  const [f, setF] = useState<Record<string, string>>({ title: prefill.text ?? "", client: prefill.member ?? "", crole: prefill.role ?? "", rep: REPS[0].id, door: "" });
  const [needPhoto, setNeedPhoto] = useState(true);
  const [needSig, setNeedSig] = useState(false);
  const [busy, setBusy] = useState(false);
  const v = (k: string) => f[k] ?? "";
  const input = (k: string, label: string, ph = "", wide = false) => (
    <label className={`dl ${wide ? "w" : ""}`}>
      <span>{label}</span>
      <input className="field" value={v(k)} placeholder={ph} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
    </label>
  );
  const digits = (s: string) => s.replace(/\D/g, "").slice(-10);
  const send = async () => {
    if (!v("title").trim() || !v("client").trim()) return onError("Add what needs to happen and the client name.");
    const T = JOB_TYPES.find((t) => t[0] === type)!;
    setBusy(true);
    try {
      const job = await api.createJob({
        rep: v("rep"), cat: type, icon: T[1], title: v("title"), client: v("client"), crole: v("crole") || "HOP member",
        phone: digits(v("phone")) ? "+1" + digits(v("phone")) : "", phoneTxt: v("phone"),
        pickup: v("pickup") || "See notes", drop: v("drop") || "See notes", window: v("window") || "As soon as possible",
        vendor: v("vendor") ? { name: v("vendor"), contact: "Main contact", phone: digits(v("vphone")) ? "+1" + digits(v("vphone")) : "", phoneTxt: v("vphone") } : null,
        items: v("items").split("\n").map((x) => x.trim()).filter(Boolean),
        notes: v("notes") || "No special instructions.",
        prefs: v("prefs").split(",").map((x) => x.trim()).filter(Boolean),
        door: v("door") ? { kind: v("door"), state: "idle" } : null,
        needPhoto, needSig, sentAt: nowTA(), requestId: prefill.id
      });
      onSent(job);
    } catch {
      onError("Could not send. Check the fields and try again.");
      setBusy(false);
    }
  };
  return (
    <div className="dmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dbox" role="dialog" aria-modal="true" aria-label="New trip or request">
        <div className="row between">
          <div><h2 className="disp" style={{ fontSize: 21, color: "var(--navy)" }}>New trip or request</h2><p style={{ color: "var(--muted)", fontSize: 13.5 }}>Goes only to the rep you pick.</p></div>
          <button className="btn o" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <p className="kick" style={{ margin: "14px 0 6px" }}>Type</p>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>{JOB_TYPES.map((t) => <button key={t[0]} className={`chip ${type === t[0] ? "on" : ""}`} onClick={() => setType(t[0])}>{t[1]} {t[2]}</button>)}</div>
        <div className="dform">
          {input("title", "What needs to happen", "Ride home after night shift", true)}
          {input("client", "Client name", "Jordan Reyes")}
          {input("crole", "Client role", "ICU Nurse")}
          {input("phone", "Client phone", "(845) 555 0142")}
          {input("window", "Time window", "7:30 to 8:00 AM")}
          {input("pickup", "Pick up", "Hospital main entrance")}
          {input("drop", "Drop off", "12 Maple Ave")}
          {input("vendor", "Vendor (optional)", "Main Street Pharmacy")}
          {input("vphone", "Vendor phone", "(845) 555 0190")}
          <label className="dl w"><span>Items or checklist, one per line</span><textarea className="field" rows={3} value={v("items")} onChange={(e) => setF({ ...f, items: e.target.value })} /></label>
          <label className="dl w"><span>Special instructions</span><textarea className="field" rows={2} value={v("notes")} onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          {input("prefs", "Member preferences, separated by commas", "Text first, Dog is friendly", true)}
          <label className="dl"><span>Smart door access</span>
            <select className="field" value={v("door")} onChange={(e) => setF({ ...f, door: e.target.value })}>
              <option value="">None</option><option>Smart lock through Alexa</option><option>Smart lock through Google Home</option><option>Ring and August lock through Alexa</option><option>Apple Home lock</option>
            </select>
          </label>
          <label className="dl"><span>Send to rep</span>
            <select className="field" value={v("rep")} onChange={(e) => setF({ ...f, rep: e.target.value })}>{REPS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
          </label>
          <div className="dl w row" style={{ gap: 18 }}>
            <label className="row" style={{ gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={needPhoto} onChange={(e) => setNeedPhoto(e.target.checked)} /> Require photo</label>
            <label className="row" style={{ gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={needSig} onChange={(e) => setNeedSig(e.target.checked)} /> Require signature</label>
          </div>
        </div>
        <div className="row" style={{ marginTop: 14, justifyContent: "flex-end" }}>
          <button className="btn p" disabled={busy} onClick={send}>{busy ? "Sending..." : "Send to rep"}</button>
        </div>
      </div>
    </div>
  );
}
