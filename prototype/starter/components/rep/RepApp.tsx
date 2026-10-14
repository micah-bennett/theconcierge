"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Phone, usePhone, ICONS } from "@/components/ui/Phone";
import { StatusSteps, statusPill } from "@/components/ui/StatusSteps";
import { SignaturePad } from "@/components/ui/SignaturePad";
import { REPS } from "@/lib/brand";
import { api, useJobs } from "@/lib/client";
import { nowT } from "@/lib/time";
import type { Job, JobStatus, LogEntry } from "@/lib/types";

const TABS = [
  { key: "jobs", label: "Jobs", icon: ICONS.plan },
  { key: "job", label: "Active", icon: ICONS.check },
  { key: "inbox", label: "Inbox", icon: ICONS.chat },
  { key: "me", label: "Me", icon: ICONS.heart }
];
const ATTN = ["Item out of stock", "Cannot reach client", "Address or entry issue", "Door access problem", "Need more details", "Safety concern"];
const QUICK = ["On my way", "Picked up", "Arrived", "Running 10 min late", "All done"];
const maps = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

export default function RepApp() {
  // TODO(IT): replace the rep picker with the signed-in rep from your auth provider.
  const [rep, setRep] = useState<string>(REPS[0].id);
  const [tab, setTab] = useState("jobs");
  const [cur, setCur] = useState<string | null>(null);
  const { jobs, online, update, loaded } = useJobs(rep);
  const R = REPS.find((r) => r.id === rep)!;
  const mine = jobs.filter((j) => j.status !== "declined");
  const job = mine.find((j) => j.id === cur) ?? mine.find((j) => j.status !== "offer" && j.status !== "completed") ?? mine[0];

  return (
    <div className="stage" style={{ display: "flex" }}>
      <aside className="side left">
        <h1>The field app for HOP concierge reps</h1>
        <p>Accept the job, know the client, call the vendor, keep the member posted, open the door safely, and prove it was done.</p>
        <p style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Signed in as</p>
        <div className="rolepick">
          {REPS.map((r) => (
            <button key={r.id} className={r.id === rep ? "on" : ""} onClick={() => { setRep(r.id); setTab("jobs"); setCur(null); }}>
              {r.name}
            </button>
          ))}
        </div>
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
          {online === null ? "Connecting to dispatch..." : online ? "Live · connected to dispatch" : "Dispatch offline"}
        </p>
      </aside>
      <Phone tabs={TABS} tab={tab} onTab={setTab}>
        <Top online={online !== false} initials={R.initials} />
        {tab === "jobs" && <JobsList key={rep} loaded={loaded} rep={R.first} jobs={mine} onOpen={(id) => { setCur(id); setTab("job"); }} update={update} />}
        {tab === "job" && (job ? <JobDetail key={job.id} job={job} repFirst={R.first} update={update} /> : <p className="sub">No jobs yet. New jobs from dispatch land on the Jobs tab.</p>)}
        {tab === "inbox" && <Inbox jobs={mine} />}
        {tab === "me" && <Me name={R.name} done={mine.filter((j) => j.status === "completed").length} />}
      </Phone>
      <aside className="side right" />
    </div>
  );
}

function Top({ online, initials }: { online: boolean; initials: string }) {
  return (
    <div className="top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="HOP" />
      <div className="row" style={{ gap: 8 }}>
        <span className={`tag ${online ? "" : "g"}`}>{online ? "● Online" : "Offline"}</span>
        <div className="avatar" style={{ background: "var(--teal)" }}>{initials}</div>
      </div>
    </div>
  );
}

function JobsList({ rep, jobs, loaded, onOpen, update }: { rep: string; jobs: Job[]; loaded: boolean; onOpen: (id: string) => void; update: (id: string, p: Partial<Job>) => void }) {
  const { toast } = usePhone();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (seen.current === null) { seen.current = new Set(jobs.map((j) => j.id)); return; }
    jobs.forEach((j) => { if (!seen.current!.has(j.id)) { seen.current!.add(j.id); toast("New job from dispatch: " + j.title); } });
  }, [jobs, loaded, toast]);
  const offers = jobs.filter((j) => j.status === "offer");
  const active = jobs.filter((j) => j.status !== "offer");
  const card = (j: Job) => {
    const [label, cls] = statusPill(j);
    return (
      <div key={j.id} className="card jobc" onClick={() => onOpen(j.id)}>
        <div className="row between">
          <div className="row">
            <div className="ico t">{j.icon}</div>
            <div>
              <h3>{j.title}</h3>
              <p style={{ fontSize: 12.5 }}>{j.window}{j.dist ? " · " + j.dist : ""}</p>
            </div>
          </div>
          <span className={`st ${cls}`}>{label}</span>
        </div>
        <p style={{ fontSize: 12.5, marginTop: 8 }}>{j.client} · {j.crole}</p>
        {j.status === "offer" && (
          <div className="row" style={{ gap: 8, marginTop: 10 }}>
            <button className="btn p" style={{ flex: 1 }} onClick={(e) => { e.stopPropagation(); update(j.id, { status: "accepted", log: [...j.log, [nowT(), "Accepted"]] }); toast("Job accepted. " + j.client.split(" ")[0] + " was notified."); onOpen(j.id); }}>Accept</button>
            <button className="btn o" onClick={(e) => { e.stopPropagation(); update(j.id, { status: "declined", log: [...j.log, [nowT(), "Passed by " + rep]] }); toast("Passed. Dispatch was told."); }}>Pass</button>
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <div className="hello disp">Hi {rep}</div>
      <div className="sub">You only see jobs dispatch sends you</div>
      <div className="sect"><h2>New offers</h2><span className="tag g">{offers.length}</span></div>
      {offers.length ? offers.map(card) : <p className="mock" style={{ textAlign: "left" }}>No new offers right now.</p>}
      <div className="sect"><h2>My jobs</h2></div>
      {active.map(card)}
    </>
  );
}

function JobDetail({ job: j, repFirst, update }: { job: Job; repFirst: string; update: (id: string, p: Partial<Job>) => void }) {
  const { toast, openSheet, closeSheet } = usePhone();
  const [upx, setUpx] = useState("");
  const [note, setNote] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const first = j.client.split(" ")[0];
  const proofOk = (!j.needPhoto || j.photos.length > 0) && (!j.needSig || !!j.sig);
  const [pill, cls] = statusPill(j);
  const set = (p: Partial<Job>) => update(j.id, p);
  const addUpdate = (text: string, extra: Partial<Job> = {}) => set({ updates: [...j.updates, [nowT(), text]], ...extra });
  const step = (s: JobStatus, label: string) =>
    set({ status: s, log: [...j.log, [nowT(), label]], updates: [...j.updates, [nowT(), "Client notified: " + label]] });

  const next: Record<string, [string, () => void]> = {
    offer: ["Accept job", () => step("accepted", "Accepted")],
    accepted: ["Start task", () => { step("started", "Started"); toast("Task started. Client is tracking you."); }],
    started: ["Arrived · in progress", () => step("in_progress", "In progress · arrived")],
    in_progress: ["Complete task", () => {
      if (j.needPhoto && !j.photos.length) return toast("Add a completion photo first.");
      if (j.needSig && !j.sig) return toast("Get a delivery signature first.");
      set({ status: "completed", attn: null, log: [...j.log, [nowT(), "Completed and verified"]], updates: [...j.updates, [nowT(), "Client notified: Completed and verified"]] });
      toast("Done. Proof sent to " + first + ".");
    }]
  };

  const addPhoto = async (dataUrl: string) => {
    const { url } = await api.upload(dataUrl, "photo", j.id).catch(() => ({ url: dataUrl }));
    addUpdate("Completion photo added", { photos: [...j.photos, url] });
    toast("Photo added to the job.");
  };

  const door = j.door;
  const doorAct = (state: NonNullable<Job["door"]>["state"], text: string, upd?: string) => {
    if (!door) return;
    const log: LogEntry[] = [...(door.log || []), [nowT(), text]];
    set({ door: { ...door, state, log }, ...(upd ? { updates: [...j.updates, [nowT(), upd]] } : {}) });
  };

  return (
    <>
      <div className="row between" style={{ marginBottom: 6 }}>
        <span className={`st ${cls}`}>{pill}</span>
        <small style={{ color: "var(--muted)", fontWeight: 700 }}>Job {j.id.toUpperCase()}</small>
      </div>
      <div className="hello disp" style={{ fontSize: 22 }}>{j.icon} {j.title}</div>
      <div className="sub">{j.window}{j.dist ? " · " + j.dist : ""}</div>
      <StatusSteps status={j.status} />

      {j.attn && (
        <div className="card" style={{ background: "#fff7ec", borderColor: "#f1d9a8" }}>
          <h3>⚠️ {j.attn.r}</h3>
          <p>{j.attn.n || "Concierge lead and client were alerted."}</p>
          <button className="btn o" style={{ marginTop: 10, padding: "7px 12px", fontSize: 12 }} onClick={() => addUpdate("Resolved: " + j.attn!.r, { attn: null })}>Resolved, continue</button>
        </div>
      )}

      {j.status === "completed" ? (
        <div className="card" style={{ background: "#e2f4e8", borderColor: "#bfe3cb" }}>
          <h3>✓ Completed and verified</h3>
          <p>Proof sent to {first} and the concierge console.</p>
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <button className={`btn ${j.status === "in_progress" && !proofOk ? "o" : "p"} w`} style={{ flex: 1 }} onClick={next[j.status]?.[1]}>{next[j.status]?.[0]}</button>
            <button className="btn o" aria-label="Needs attention" onClick={() => openSheet(<AttnSheet onSend={(r, n) => { addUpdate("Needs attention: " + r + (n ? " · " + n : ""), { attn: { r, n } }); closeSheet(); toast("Alert sent to the client and concierge lead."); }} />)}>⚠️</button>
          </div>
          {j.status === "in_progress" && !proofOk && <p className="mock" style={{ margin: "-6px 0 12px", textAlign: "left" }}>Add the required proof below to complete.</p>}
        </>
      )}

      <div className="card">
        <small className="kick">Client</small>
        <h3 style={{ marginTop: 6 }}>{j.client}</h3>
        <p style={{ fontSize: 12.5 }}>{j.crole} · {j.phoneTxt}</p>
        <div className="moods" style={{ margin: "8px 0" }}>{j.prefs.map((p) => <span key={p} className="chip" style={{ cursor: "default", fontSize: 12, padding: "5px 10px" }}>{p}</span>)}</div>
        {/* TODO(IT): swap tel:/sms: for the masked number from POST /api/calls */}
        <div className="cact">
          <a className="btn n" href={`tel:${j.phone}`}>📞 Call</a>
          <a className="btn o" href={`sms:${j.phone}`}>💬 Text</a>
          <button className="btn o" onClick={() => toast("In app chat opens here. [Build with your realtime provider]")}>Chat</button>
        </div>
        <p className="mock" style={{ textAlign: "left" }}>Calls and texts go through a masked HOP number. [CONFIRM phone provider]</p>
      </div>

      {j.vendor && (
        <div className="card">
          <small className="kick">Vendor</small>
          <div className="row between" style={{ marginTop: 6 }}>
            <div><h3>{j.vendor.name}</h3><p style={{ fontSize: 12.5 }}>{j.vendor.contact} · {j.vendor.phoneTxt}</p></div>
            <a className="btn o" style={{ padding: "8px 12px" }} href={`tel:${j.vendor.phone}`}>📞 Call</a>
          </div>
        </div>
      )}

      <div className="card">
        <small className="kick">Task details</small>
        {[["A", j.pickup, "Pick up", "var(--teal)"], ["B", j.drop, "Drop off", "var(--navy)"]].map(([l, a, s, c]) => (
          <div className="addr" key={l}>
            <span style={{ background: c }}>{l}</span>
            <div className="grow"><b>{a}</b><small>{s}</small></div>
            <a href={maps(a)} target="_blank" rel="noopener noreferrer" className="tag s">Navigate</a>
          </div>
        ))}
        <p className="kick" style={{ marginTop: 10 }}>Checklist</p>
        {j.items.map((it, i) => (
          <button key={i} className={`chk ${j.done[i] ? "on" : ""}`} onClick={() => set({ done: { ...j.done, [i]: !j.done[i] } })}>
            <span>{j.done[i] ? "✓" : ""}</span>{it}
          </button>
        ))}
        <div className="instr"><b>Special instructions</b><p>{j.notes}</p></div>
      </div>

      {door && (
        <div className="card door">
          <div className="row between">
            <div className="row"><div className="ico nv">🚪</div><div><h3>Smart door access</h3><p style={{ fontSize: 12.5 }}>{door.kind}</p></div></div>
            <span className="tag">{{ idle: "Not requested", asked: "Waiting for client", ok: "Approved", open: "Unlocked", closed: "Locked again" }[door.state]}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            {door.state === "idle" && (
              <button className="btn n w" onClick={() => {
                doorAct("asked", "Access requested from " + first);
                // TODO(IT): real approval comes from the member's app or watch. Simulated here.
                setTimeout(() => { set({ door: { ...door, state: "ok", log: [...(door.log || []), [nowT(), "Access requested from " + first], [nowT(), first + " approved access for this window"]] } }); toast("Client approved door access."); }, 1800);
              }}>Request access from client</button>
            )}
            {door.state === "asked" && <button className="btn o w" disabled>Waiting...</button>}
            {(door.state === "ok" || door.state === "closed") && (
              <button className="btn p w" onClick={() => { fetch("/api/door", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: j.id, action: "unlock" }) }); doorAct("open", "Door unlocked by " + repFirst + ", HOP rep", "Door unlocked, entering now"); toast("Door unlocked. It relocks in 10 minutes."); }}>🔓 Unlock door</button>
            )}
            {door.state === "open" && (
              <button className="btn n w" onClick={() => { fetch("/api/door", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId: j.id, action: "lock" }) }); doorAct("closed", "Door locked", "Door locked behind me"); toast("Door locked. Logged for the client."); }}>🔒 Lock door now</button>
            )}
          </div>
          {door.log && <Timeline items={door.log} />}
          <p className="mock" style={{ textAlign: "left" }}>Only inside the approved window. Every unlock is logged and shared with the client. [CONFIRM smart lock partners]</p>
        </div>
      )}

      <div className="card">
        <div className="row between"><small className="kick">Tracking updates to client</small><button className={`toggle ${j.share ? "on" : ""}`} aria-label="Share live location" onClick={() => set({ share: !j.share })} /></div>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>{j.share ? "Live location shared while this job is active" : "Live location off"}</p>
        <div className="moods" style={{ margin: "0 0 8px" }}>
          {QUICK.map((u) => <button key={u} className="chip" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { addUpdate("Sent: " + u); toast("Update sent to " + first + "."); }}>{u}</button>)}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input className="field" value={upx} onChange={(e) => setUpx(e.target.value)} placeholder="Custom update" style={{ padding: "9px 12px" }} />
          <button className="btn n" style={{ padding: "9px 12px" }} onClick={() => { if (!upx.trim()) return; addUpdate("Sent: " + upx.trim()); setUpx(""); toast("Update sent."); }}>Send</button>
        </div>
        <Timeline items={[...j.log.map(([t, x]) => [t, "Status: " + x] as LogEntry), ...j.updates]} />
      </div>

      <div className="card">
        <small className="kick">Proof of completion</small>
        <div className="row between" style={{ marginTop: 8 }}>
          <div><b style={{ fontSize: 14 }}>📷 Photo verification</b><small style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{j.needPhoto ? "Required" : "Optional"} · {j.photos.length} added</small></div>
          <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => fileRef.current?.click()}>Take photo</button>
        </div>
        <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > 2_000_000) return toast("Photo is too large. Try again.");
          const rd = new FileReader();
          rd.onload = () => addPhoto(String(rd.result));
          rd.readAsDataURL(f);
        }} />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {j.photos.length > 0 && <div className="thumbs">{j.photos.map((p, i) => <img key={i} src={p} alt="Proof photo" />)}</div>}
        <div className="row between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div><b style={{ fontSize: 14 }}>✍️ Delivery signature</b><small style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{j.needSig ? "Required" : "Optional"} · {j.sig ? "Signed by " + j.signedBy : "Not signed"}</small></div>
          <button className={`btn ${j.sig ? "o" : "p"}`} style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => openSheet(
            <SignaturePad title={`${j.title} for ${j.client}`} onError={toast} onSave={async (png, name) => {
              const { url } = await api.upload(png, "signature", j.id).catch(() => ({ url: png }));
              addUpdate("Signature captured from " + name, { sig: url, signedBy: name });
              closeSheet();
              toast("Signature saved to the job.");
            }} />
          )}>{j.sig ? "Redo" : "Sign"}</button>
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {j.sig && <img src={j.sig} alt="Signature" style={{ width: "100%", height: 80, objectFit: "contain", background: "var(--cream)", borderRadius: 12, marginTop: 8 }} />}
      </div>

      <div className="card">
        <small className="kick">Rep notes</small>
        {j.notesList.map((n, i) => <p key={i} style={{ fontSize: 13, color: "var(--ink)", marginTop: 6 }}>• {n}</p>)}
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team" style={{ padding: "9px 12px" }} />
          <button className="btn o" style={{ padding: "9px 12px" }} onClick={() => { if (!note.trim()) return; set({ notesList: [...j.notesList, note.trim()] }); setNote(""); }}>Add</button>
        </div>
      </div>
    </>
  );
}

function AttnSheet({ onSend }: { onSend: (r: string, n: string) => void }) {
  const [r, setR] = useState(ATTN[4]);
  const [n, setN] = useState("");
  return (
    <div>
      <h2 className="disp" style={{ color: "var(--navy)", fontSize: 20 }}>Needs special attention</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 12px" }}>The client and concierge lead get an alert right away.</p>
      <div className="moods" style={{ margin: "0 0 10px" }}>{ATTN.map((x) => <button key={x} className={`chip ${x === r ? "on" : ""}`} onClick={() => setR(x)}>{x}</button>)}</div>
      <textarea className="field" rows={3} value={n} onChange={(e) => setN(e.target.value)} placeholder="What do you need?" />
      <button className="btn c w" style={{ marginTop: 10 }} onClick={() => onSend(r, n.trim())}>Send alert</button>
    </div>
  );
}

export function Timeline({ items }: { items: LogEntry[] }) {
  const sorted = useMemo(() => [...items], [items]);
  if (!sorted.length) return null;
  return <div className="tl" style={{ marginTop: 12 }}>{sorted.map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}</div>;
}

function Inbox({ jobs }: { jobs: Job[] }) {
  return (
    <>
      <div className="hello disp">Inbox</div>
      <div className="sub">Messages with members and the concierge lead.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {jobs.filter((j) => j.status !== "offer").map((j) => (
          <div className="it" key={j.id}>
            <div className="avatar" style={{ background: "var(--sky)" }}>{j.client[0]}</div>
            <div className="grow"><b>{j.client}</b><small>{(j.updates.at(-1)?.[1] || "Thank you for taking this!").slice(0, 48)}</small></div>
          </div>
        ))}
      </div>
      <p className="mock">TODO(IT): connect to your realtime messaging provider.</p>
    </>
  );
}

function Me({ name, done }: { name: string; done: number }) {
  const { toast } = usePhone();
  const [on, setOn] = useState(true);
  return (
    <>
      <div className="hello disp">{name}</div>
      <div className="sub">HOP Concierge Rep</div>
      <div className="card"><div className="row between"><div><h3>{on ? "You are online" : "You are offline"}</h3><p>{on ? "New job offers will come to you." : "Go online to get offers."}</p></div><button className={`toggle ${on ? "on" : ""}`} aria-label="Online" onClick={() => setOn(!on)} /></div></div>
      <div className="grid2"><div className="tile"><b style={{ fontSize: 20 }}>{done}</b><span>Completed</span></div><div className="tile"><b style={{ fontSize: 20 }}>4.9</b><span>Member rating</span></div></div>
      <button className="btn c w" style={{ marginTop: 12 }} onClick={() => toast("Concierge lead is calling you now. Location shared.")}>Safety help</button>
      <p className="mock">Connects you to the concierge lead and shares your location. [CONFIRM safety process]</p>
    </>
  );
}
