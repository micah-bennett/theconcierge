"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { JOB_TYPES } from "@hop/shared/brand";
import { ApiError, j, useJobs } from "@hop/shared/client";
import { nowT, nowTA } from "@hop/shared/time";
import type { Job, JobCat } from "@hop/shared/types";
import { useDesktopToast } from "@hop/shared/ui/Phone";
import { statusPill } from "@hop/shared/ui/StatusSteps";
import { STAGES, STAGE_LABEL, requestStage, stageClass, stepsOn } from "@/lib/lifecycle";
import type { ConsoleRep, ConsoleRequest, JobsResponse } from "@/lib/types";

/** What the composer opens with: blank, or prefilled from a queued staff request. */
type Prefill = { requestId?: string; cat?: JobCat; title?: string; client?: string; crole?: string; phone?: string; window?: string; notes?: string };

const typeOf = (cat: string) => JOB_TYPES.find((t) => t[0] === cat);
const errMsg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong");

function when(ms: number) {
  const d = new Date(ms);
  const today = new Date().toDateString() === d.toDateString();
  return today ? nowTA(d) : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${nowTA(d)}`;
}

/** Composer prefill from a queued request. The job title is capped at 140, so a long request also goes into the notes. */
function prefillFrom(r: ConsoleRequest): Prefill {
  const long = r.text.length > 140;
  return {
    requestId: r.id,
    cat: r.cat,
    title: long ? r.text.slice(0, 137).trimEnd() + "..." : r.text,
    client: r.member,
    crole: r.role,
    phone: r.memberPhone,
    window: r.window,
    notes: long ? r.text : undefined
  };
}

// Sample data, as in the mockup. TODO(IT): count real requests by category once there is enough volume.
const VOLUME_SAMPLE: [string, number][] = [["Rides", 38], ["Food", 52], ["Errands", 44], ["Wellness", 17], ["Family", 26]];

// The mockup's service network. Partners are an open business decision.
const NETWORK: [string, string, string, string][] = [
  ["🚗", "Rides", "HOP team plus partner network", "Partner [CONFIRM]"],
  ["🍱", "Food", "On site runner plus local delivery", "Partner [CONFIRM]"],
  ["📦", "Errands", "HOP concierge team", "HOP team"],
  ["🧘", "Wellness", "Local wellness providers", "Partner [CONFIRM]"],
  ["🏡", "Family and home", "Vetted childcare, pet care, pickups", "HOP team"]
];

export default function ConsoleApp() {
  const [reps, setReps] = useState<ConsoleRep[]>([]);
  const { jobs, online, update, refresh } = useJobs<JobsResponse>({ onData: (r) => setReps(r.reps) });
  const { toast, node } = useDesktopToast();
  const [reqs, setReqs] = useState<ConsoleRequest[]>([]);
  const [reqsLoaded, setReqsLoaded] = useState(false);
  const [reqFilter, setReqFilter] = useState<"open" | "all">("open");
  const [sel, setSel] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [open, setOpen] = useState<string | null>(null);
  const [compose, setCompose] = useState<Prefill | null>(null);

  const loadReqs = useCallback(async () => {
    try {
      const r = await j<{ requests: ConsoleRequest[] }>("/api/requests");
      setReqs(r.requests);
      setReqsLoaded(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    loadReqs();
    const t = setInterval(loadReqs, 5000);
    return () => clearInterval(t);
  }, [loadReqs]);

  const activeReps = reps.filter((r) => r.active);
  const repName = (id: string) => reps.find((r) => r.id === id)?.first ?? "Unassigned";
  const jobById = useMemo(() => new Map(jobs.map((x) => [x.id, x])), [jobs]);
  const jobFor = (r: ConsoleRequest) => (r.jobId ? jobById.get(r.jobId) : undefined);

  const list = jobs.filter((x) => filter === "all" || x.rep === filter);
  const active = (id: string) => jobs.filter((x) => x.rep === id && !["completed", "declined"].includes(x.status)).length;
  const newReqs = reqs.filter((r) => r.status === "new");
  const openReqs = reqs.filter((r) => r.status === "new" || r.status === "dispatched");
  const shownReqs = reqFilter === "open" ? openReqs : reqs;
  const current = reqs.find((r) => r.id === sel) ?? shownReqs[0] ?? null;

  const viewJob = (id: string) => {
    setFilter("all");
    setOpen(id);
    requestAnimationFrame(() => document.getElementById(`job-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }));
  };

  const setRequestStatus = async (r: ConsoleRequest, status: "new" | "cancelled") => {
    if (status === "cancelled" && !window.confirm(`Cancel "${r.text}" for ${r.member}?`)) return;
    try {
      await j(`/api/requests?id=${encodeURIComponent(r.id)}`, { method: "PATCH", body: JSON.stringify({ status }) });
      toast(status === "cancelled" ? "Request cancelled." : "Request is back in the queue.");
      loadReqs();
    } catch (e) {
      toast(errMsg(e));
    }
  };

  const reassign = (x: Job, to: string) => {
    const name = repName(to);
    update(x.id, { rep: to, status: "offer", attn: null, log: [...x.log, [nowT(), "Reassigned to " + name]] })
      .then(() => toast(`Sent to ${name}. Only ${name} can see it now.`))
      .catch((e) => toast(errMsg(e)));
  };

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
        <div className="kpi"><small>Active jobs</small><b>{jobs.filter((x) => !["completed", "declined"].includes(x.status)).length}</b><span>Across all reps</span></div>
        <div className="kpi"><small>Needs attention</small><b>{jobs.filter((x) => x.attn).length}</b><span className="m">Flagged by reps</span></div>
        <div className="kpi"><small>Completed</small><b>{jobs.filter((x) => x.status === "completed").length}</b><span>{jobs.filter((x) => x.status === "completed" && (x.photos.length || x.sig)).length} with proof</span></div>
      </div>

      <div className="panel" style={{ marginBottom: 18 }}>
        <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
          <div>
            <h2 className="disp" style={{ fontSize: 20, color: "var(--navy)" }}>Dispatch to reps</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>Only the rep you pick sees the job. Their updates come back here.</p>
          </div>
          <button className="btn p" onClick={() => setCompose({})}>+ New trip or request</button>
        </div>
        <div className="row" style={{ gap: 8, margin: "14px 0 6px", flexWrap: "wrap" }}>
          <span className={`tag ${online ? "s" : "g"}`}>{online ? "● Live · connected to rep app" : online === false ? "Offline · retrying" : "Connecting..."}</span>
          <button className={`chip ${filter === "all" ? "on" : ""}`} onClick={() => setFilter("all")} style={{ fontSize: 12, padding: "6px 11px" }}>All reps</button>
          {activeReps.map((r) => (
            <button key={r.id} className={`chip ${filter === r.id ? "on" : ""}`} onClick={() => setFilter(r.id)} style={{ fontSize: 12, padding: "6px 11px" }}>{r.name} · {active(r.id)} active</button>
          ))}
        </div>
        <div className="dtwrap">
          <table className="dtab">
            <thead><tr><th>Sent</th><th>Rep</th><th>Request</th><th>Client</th><th>Status</th><th>Proof</th><th>Latest update</th><th /></tr></thead>
            <tbody>
              {list.map((x) => {
                const [label, cls] = statusPill(x);
                const last = [...x.log, ...x.updates].at(-1);
                return [
                  <tr key={x.id} id={`job-${x.id}`} className={open === x.id ? "sel" : ""}>
                    <td>{x.sentAt}</td>
                    <td><b>{repName(x.rep)}</b></td>
                    <td>{x.icon} {x.title}<br /><small style={{ color: "var(--muted)" }}>{x.window}</small></td>
                    <td>{x.client}</td>
                    <td><span className={`st ${cls}`}>{label}</span></td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {x.photos.length ? `📷 ${x.photos.length}` : <span style={{ color: "#b9c4d4" }}>📷</span>} {x.sig ? "✍️" : <span style={{ color: "#b9c4d4" }}>✍️</span>}
                    </td>
                    <td><small>{last ? `${last[0]} · ${last[1]}` : "No updates yet"}</small></td>
                    <td><button className="btn o" style={{ padding: "6px 10px", fontSize: 12 }} onClick={() => setOpen(open === x.id ? null : x.id)}>{open === x.id ? "Close" : "Details"}</button></td>
                  </tr>,
                  open === x.id && <JobDetails key={x.id + "-d"} j={x} reps={activeReps} repName={repName} onReassign={(to) => reassign(x, to)} />
                ];
              })}
              {!list.length && <tr><td colSpan={8} style={{ color: "var(--muted)" }}>Nothing dispatched yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cgrid" style={{ marginBottom: 18 }}>
        <div className="panel">
          <div className="row between" style={{ flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2>Staff request queue</h2>
              <p className="ps">From the Staff App. Pick a request to see its timeline, then turn it into a job for a rep.</p>
            </div>
            <div className="row" style={{ gap: 6 }}>
              <button className={`chip ${reqFilter === "open" ? "on" : ""}`} onClick={() => setReqFilter("open")} style={{ fontSize: 12, padding: "6px 11px" }}>Open · {openReqs.length}</button>
              <button className={`chip ${reqFilter === "all" ? "on" : ""}`} onClick={() => setReqFilter("all")} style={{ fontSize: 12, padding: "6px 11px" }}>All · {reqs.length}</button>
            </div>
          </div>
          <div className="dtwrap">
            <table className="dtab">
              <thead><tr><th>Member</th><th>Request</th><th>Received</th><th>Status</th><th /></tr></thead>
              <tbody>
                {shownReqs.map((r) => {
                  const stage = requestStage(r, jobFor(r));
                  return (
                    <tr key={r.id} className={current?.id === r.id ? "sel" : ""} onClick={() => setSel(r.id)} style={{ cursor: "pointer" }}>
                      <td><b>{r.member}</b><br /><small style={{ color: "var(--muted)" }}>{r.role}</small></td>
                      <td>{typeOf(r.cat)?.[1]} {r.text}{r.urgent && <> <span className="tag c">Urgent</span></>}</td>
                      <td style={{ whiteSpace: "nowrap" }}><small>{when(r.createdAt)}</small></td>
                      <td><span className={`st ${stageClass(stage)}`}>{STAGE_LABEL[stage]}</span></td>
                      <td>
                        {r.status === "new" && (
                          <button className="btn p" style={{ padding: "6px 12px", fontSize: 12 }} onClick={(e) => { e.stopPropagation(); setCompose(prefillFrom(r)); }}>Dispatch</button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {!shownReqs.length && (
                  <tr><td colSpan={5} style={{ color: "var(--muted)" }}>{!reqsLoaded ? "Loading..." : reqFilter === "open" && reqs.length ? "Nothing waiting. Every request is handled." : "No staff requests yet."}</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div>
          {current ? (
            <RequestPanel
              r={current}
              job={jobFor(current)}
              repName={repName}
              onDispatch={() => setCompose(prefillFrom(current))}
              onViewJob={viewJob}
              onStatus={(s) => setRequestStatus(current, s)}
            />
          ) : (
            <div className="panel"><h2>Request details</h2><p className="ps">Pick a request from the queue.</p></div>
          )}
          <div className="panel" style={{ marginTop: 16 }}>
            <h2>Service network</h2>
            <p className="ps">One gateway, with the HOP team as the always available backup.</p>
            {NETWORK.map((n) => (
              <div key={n[1]} className="netrow">
                <div className="ico t">{n[0]}</div>
                <div className="grow"><b>{n[1]}</b><small>{n[2]}</small></div>
                <span className={`tag ${n[3] === "HOP team" ? "" : "g"}`}>{n[3]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="row between">
          <h2>Today&apos;s volume by service</h2>
          <span className="tag g">Sample</span>
        </div>
        <p className="ps">Sample data</p>
        <div className="bars" style={{ height: 140 }}>
          {VOLUME_SAMPLE.map(([k, v]) => (
            <div key={k}>
              <b style={{ fontSize: 12, color: "var(--navy)" }}>{v}</b>
              <i style={{ height: `${(v / 56) * 100}%`, background: "var(--teal)" }} />
              <small>{k}</small>
            </div>
          ))}
        </div>
      </div>
      <p className="note">Requests, dispatch and rep updates are live. Volume by service is sample data. Service partners are not confirmed yet.</p>

      {compose && (
        <Composer
          prefill={compose}
          reps={activeReps}
          onClose={() => setCompose(null)}
          onSent={(x) => {
            setCompose(null);
            refresh();
            loadReqs();
            const name = repName(x.rep);
            toast(`Sent to ${name}. Only ${name} can see it.`);
          }}
          onError={toast}
        />
      )}
    </section>
  );
}

function RequestPanel({
  r,
  job,
  repName,
  onDispatch,
  onViewJob,
  onStatus
}: {
  r: ConsoleRequest;
  job: Job | undefined;
  repName: (id: string) => string;
  onDispatch: () => void;
  onViewJob: (id: string) => void;
  onStatus: (s: "new" | "cancelled") => void;
}) {
  const stage = requestStage(r, job);
  const on = stepsOn(stage);
  return (
    <div className="panel">
      <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
        <span className={`st ${stageClass(stage)}`}>{STAGE_LABEL[stage]}</span>
        {job && <span className={`st ${statusPill(job)[1]}`}>Job: {statusPill(job)[0]}</span>}
        {r.urgent && <span className="tag c">Urgent</span>}
      </div>
      <h2 style={{ marginTop: 10 }}>{typeOf(r.cat)?.[1]} {r.text}</h2>
      <p className="ps">{r.member}{r.role ? ` · ${r.role}` : ""}{r.window ? ` · ${r.window}` : ""}</p>

      <div className="stepper" style={{ gridTemplateColumns: "repeat(5,1fr)" }}>
        {STAGES.map((s, i) => (
          <div key={s} className={on[i] ? "on" : ""}><i /><small>{STAGE_LABEL[s]}</small></div>
        ))}
      </div>

      <div className="memb">
        <div className="row between"><small className="kick">Know your member</small></div>
        {r.memberPrefs.length ? (
          <div className="moods" style={{ margin: "8px 0" }}>
            {r.memberPrefs.map((p, i) => (
              <span key={i} className="chip" style={{ cursor: "default", fontSize: 12, padding: "5px 10px" }} title={p.k}>{p.i ? `${p.i} ` : ""}{p.v}</span>
            ))}
          </div>
        ) : (
          <p style={{ fontSize: 12.5, color: "var(--ink)", margin: "8px 0" }}>No preferences shared yet.</p>
        )}
        <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 4 }}>Only what this member chose to share with HOP.</p>
      </div>

      <div className="tl" style={{ marginBottom: 16 }}>
        <div><small>{when(r.createdAt)}</small>Request received</div>
        {job && <div><small>{job.sentAt}</small>Sent to {repName(job.rep)}</div>}
        {job?.log.map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}
        {r.status === "cancelled" && <div><small /> Cancelled by the concierge team</div>}
      </div>
      {job?.attn && <div className="instr" style={{ marginBottom: 12 }}><b>⚠️ {job.attn.r}</b><p>{job.attn.n}</p></div>}

      <div className="row" style={{ gap: 8, flexWrap: "wrap" }}>
        {r.status === "new" && <button className="btn p" onClick={onDispatch}>Dispatch to a rep</button>}
        {r.status === "new" && <button className="btn o" onClick={() => onStatus("cancelled")}>Cancel request</button>}
        {r.status === "cancelled" && <button className="btn o" onClick={() => onStatus("new")}>Reopen</button>}
        {job && <button className="btn o" onClick={() => onViewJob(job.id)}>View job</button>}
        {stage === "verified" || stage === "completed" ? <span className="tag">All done</span> : null}
      </div>
    </div>
  );
}

function JobDetails({ j, reps, repName, onReassign }: { j: Job; reps: ConsoleRep[]; repName: (id: string) => string; onReassign: (rep: string) => void }) {
  const [to, setTo] = useState(reps.some((r) => r.id === j.rep) ? j.rep : (reps[0]?.id ?? ""));
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
            {j.sig ? <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 12, marginTop: 8, padding: 6 }}><img src={j.sig} alt="Signature" style={{ width: "100%", height: 80, objectFit: "contain" }} /><small style={{ fontSize: 11.5, color: "var(--muted)" }}>Signed by {j.signedBy || "recipient"}</small></div> : <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>No signature yet</p>}
            <p className="kick" style={{ marginTop: 12 }}>Reassign</p>
            {reps.length ? (
              <div className="row" style={{ gap: 6, marginTop: 6 }}>
                <select className="field" value={to} onChange={(e) => setTo(e.target.value)} style={{ padding: 8 }}>{reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select>
                <button className="btn n" style={{ padding: "8px 12px" }} onClick={() => to && onReassign(to)}>Send</button>
              </div>
            ) : (
              <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 6 }}>No active reps. Invite one on the Team screen.</p>
            )}
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

const SAMPLE: Record<string, string> = {
  title: "Ride home after night shift",
  client: "Jordan Reyes",
  crole: "ICU Nurse",
  phone: "(845) 555 0142",
  window: "7:30 to 8:00 AM",
  pickup: "Hospital main entrance",
  drop: "12 Maple Ave, Apt 3",
  vendor: "",
  vphone: "",
  items: "Meet at the main entrance\nBring a phone charger",
  notes: "Long night. Keep it quiet and stop for coffee if asked.",
  prefs: "Text first, Large oat milk latte"
};

function Composer({ prefill, reps, onClose, onSent, onError }: { prefill: Prefill; reps: ConsoleRep[]; onClose: () => void; onSent: (j: Job) => void; onError: (m: string) => void }) {
  const [type, setType] = useState<JobCat>(prefill.cat ?? "ride");
  const [f, setF] = useState<Record<string, string>>({
    title: prefill.title ?? "",
    client: prefill.client ?? "",
    crole: prefill.crole ?? "",
    phone: prefill.phone ?? "",
    window: prefill.window ?? "",
    notes: prefill.notes ?? "",
    rep: reps[0]?.id ?? "",
    door: ""
  });
  const [needPhoto, setNeedPhoto] = useState(true);
  const [needSig, setNeedSig] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

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
    if (!v("rep")) return onError("Pick a rep. Invite one on the Team screen if there are none.");
    const T = typeOf(type)!;
    setBusy(true);
    try {
      const job = await j<Job>("/api/jobs", {
        method: "POST",
        body: JSON.stringify({
          rep: v("rep"), cat: type, icon: T[1], title: v("title").trim(), client: v("client").trim(), crole: v("crole").trim() || "HOP member",
          phone: digits(v("phone")) ? "+1" + digits(v("phone")) : "", phoneTxt: v("phone"),
          pickup: v("pickup") || "See notes", drop: v("drop") || "See notes", window: v("window") || "As soon as possible",
          vendor: v("vendor") ? { name: v("vendor"), contact: "Main contact", phone: digits(v("vphone")) ? "+1" + digits(v("vphone")) : "", phoneTxt: v("vphone") } : null,
          items: v("items").split("\n").map((x) => x.trim()).filter(Boolean),
          notes: v("notes") || "No special instructions.",
          prefs: v("prefs").split(",").map((x) => x.trim()).filter(Boolean),
          door: v("door") ? { kind: v("door"), state: "idle" } : null,
          needPhoto, needSig, sentAt: nowTA(), requestId: prefill.requestId
        })
      });
      onSent(job);
    } catch (e) {
      onError(e instanceof ApiError ? e.message : "Could not send. Check the fields and try again.");
      setBusy(false);
    }
  };
  return (
    <div className="dmodal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="dbox" role="dialog" aria-modal="true" aria-label="New trip or request">
        <div className="row between">
          <div>
            <h2 className="disp" style={{ fontSize: 21, color: "var(--navy)" }}>New trip or request</h2>
            <p style={{ color: "var(--muted)", fontSize: 13.5 }}>{prefill.requestId ? `From ${prefill.client}'s request. ` : ""}Goes only to the rep you pick.</p>
          </div>
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
          <label className="dl w"><span>Items or checklist, one per line</span><textarea className="field" rows={3} value={v("items")} placeholder={"Prescription bag\nIbuprofen"} onChange={(e) => setF({ ...f, items: e.target.value })} /></label>
          <label className="dl w"><span>Special instructions</span><textarea className="field" rows={2} value={v("notes")} placeholder="Do not ring the bell. Leave inside the door." onChange={(e) => setF({ ...f, notes: e.target.value })} /></label>
          {input("prefs", "Member preferences, separated by commas", "Text first, Dog is friendly", true)}
          <label className="dl"><span>Smart door access</span>
            <select className="field" value={v("door")} onChange={(e) => setF({ ...f, door: e.target.value })}>
              <option value="">None</option><option>Smart lock through Alexa</option><option>Smart lock through Google Home</option><option>Ring and August lock through Alexa</option><option>Apple Home lock</option>
            </select>
          </label>
          <label className="dl"><span>Send to rep</span>
            <select className="field" value={v("rep")} onChange={(e) => setF({ ...f, rep: e.target.value })}>
              {!reps.length && <option value="">No active reps</option>}
              {reps.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </label>
          <div className="dl w row" style={{ gap: 18 }}>
            <label className="row" style={{ gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={needPhoto} onChange={(e) => setNeedPhoto(e.target.checked)} /> Require photo</label>
            <label className="row" style={{ gap: 6, fontSize: 13.5 }}><input type="checkbox" checked={needSig} onChange={(e) => setNeedSig(e.target.checked)} /> Require signature</label>
          </div>
        </div>
        <div className="row between" style={{ marginTop: 14, gap: 8, flexWrap: "wrap" }}>
          <button className="btn o" onClick={() => setF({ ...f, ...SAMPLE })}>Fill with sample</button>
          <button className="btn p" disabled={busy || !reps.length} onClick={send}>{busy ? "Sending..." : "Send to rep"}</button>
        </div>
      </div>
    </div>
  );
}
