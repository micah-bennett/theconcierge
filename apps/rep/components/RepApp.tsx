"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, j as api, useJobs } from "@hop/shared/client";
import { nowT } from "@hop/shared/time";
import type { Job, JobStatus, LogEntry } from "@hop/shared/types";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import { ICONS, Phone, usePhone } from "@hop/shared/ui/Phone";
import { SignaturePad } from "@hop/shared/ui/SignaturePad";
import { StatusSteps, statusPill } from "@hop/shared/ui/StatusSteps";
import { downscalePhoto, samplePhoto } from "@/lib/image";

/*
 * Concierge Rep App, ported from prototype/starter/components/rep/RepApp.tsx.
 * Changes from the starter: no rep picker (identity is the session), the server filters jobs,
 * failed saves show the server's message, photos are downscaled before upload, and the mockup's
 * extras (Sample photo, chat sheet, done-today tiles, start-of-shift checklist, proof on the
 * completed card) are built in the starter's style.
 */

type Me = { first: string; name: string; initials: string };
type Update = (id: string, p: Partial<Job>) => Promise<Job>;
/** Sample in-app chat threads, kept in memory only. TODO(IT): realtime messaging provider. */
type Threads = Record<string, ["me" | "them", string][]>;

const TABS = [
  { key: "jobs", label: "Jobs", icon: ICONS.plan },
  { key: "job", label: "Active", icon: ICONS.check },
  { key: "inbox", label: "Inbox", icon: ICONS.chat },
  { key: "me", label: "Me", icon: ICONS.heart }
];
const ATTN = ["Item out of stock", "Cannot reach client", "Address or entry issue", "Door access problem", "Need more details", "Safety concern"];
const QUICK = ["On my way", "Picked up", "Arrived", "Running 10 min late", "All done"];
const SHIFT = ["Badge and ID on", "Phone charged, car charger in", "Vehicle check done", "Insulated bags in the car"];
const MAX_PHOTOS = 6;
const maps = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
const firstName = (s: string) => s.split(" ")[0];
const errMsg = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong. Try again.");
const isToday = (ms: number) => new Date(ms).toDateString() === new Date().toDateString();

function upload(dataUrl: string, kind: "photo" | "signature", jobId: string) {
  return api<{ url: string }>("/api/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind, jobId }) });
}

export default function RepApp({ me }: { me: Me }) {
  const [tab, setTab] = useState("jobs");
  const [cur, setCur] = useState<string | null>(null);
  const [threads, setThreads] = useState<Threads>({});
  const { jobs, online, update, loaded } = useJobs();
  const mine = jobs.filter((j) => j.status !== "declined");
  const job = mine.find((j) => j.id === cur) ?? mine.find((j) => j.status !== "offer" && j.status !== "completed") ?? mine[0];
  const doneToday = mine.filter((j) => j.status === "completed" && isToday(j.updatedAt)).length;

  const thread = useCallback((j: Job) => threads[j.id] ?? [["them", firstName(j.client) + ": Thank you for taking this!"]], [threads]);
  const say = useCallback(
    (j: Job, who: "me" | "them", text: string) =>
      setThreads((t) => ({ ...t, [j.id]: [...(t[j.id] ?? [["them", firstName(j.client) + ": Thank you for taking this!"]]), [who, text]] })),
    []
  );

  return (
    <div className="stage" style={{ display: "flex" }}>
      <aside className="side left">
        <h1>The field app for HOP concierge reps</h1>
        <p>Accept the job, know the client, call the vendor, keep the member posted, open the door safely, and prove it was done.</p>
        <p style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Signed in as {me.name}</p>
        <SignOutButton />
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
          {online === null ? "Connecting to dispatch..." : online ? "Live · connected to dispatch" : "Dispatch offline"}
        </p>
      </aside>
      <Phone tabs={TABS} tab={tab} onTab={setTab}>
        <Top online={online !== false} initials={me.initials} />
        {tab === "jobs" && <JobsList loaded={loaded} rep={me.first} jobs={mine} doneToday={doneToday} onOpen={(id) => { setCur(id); setTab("job"); }} update={update} />}
        {tab === "job" &&
          (job ? (
            <JobDetail key={job.id} job={job} repFirst={me.first} update={update} say={say} thread={thread(job)} />
          ) : (
            <p className="sub">{loaded ? "No jobs yet. New jobs from dispatch land on the Jobs tab." : "Loading your jobs..."}</p>
          ))}
        {tab === "inbox" && <Inbox jobs={mine} thread={thread} say={say} />}
        {tab === "me" && <MeTab name={me.name} done={doneToday} />}
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

function JobsList({ rep, jobs, loaded, doneToday, onOpen, update }: { rep: string; jobs: Job[]; loaded: boolean; doneToday: number; onOpen: (id: string) => void; update: Update }) {
  const { toast } = usePhone();
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!loaded) return;
    if (seen.current === null) {
      seen.current = new Set(jobs.map((j) => j.id));
      return;
    }
    jobs.forEach((j) => {
      if (!seen.current!.has(j.id)) {
        seen.current!.add(j.id);
        toast("New job from dispatch: " + j.title);
      }
    });
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
            <button
              className="btn p"
              style={{ flex: 1 }}
              onClick={(e) => {
                e.stopPropagation();
                update(j.id, { status: "accepted", log: [...j.log, [nowT(), "Accepted"]] })
                  .then(() => toast("Job accepted. " + firstName(j.client) + " was notified."))
                  .catch((err) => toast(errMsg(err)));
                onOpen(j.id);
              }}
            >
              Accept
            </button>
            <button
              className="btn o"
              onClick={(e) => {
                e.stopPropagation();
                update(j.id, { status: "declined", log: [...j.log, [nowT(), "Passed by " + rep]] })
                  .then(() => toast("Passed. Dispatch was told."))
                  .catch((err) => toast(errMsg(err)));
              }}
            >
              Pass
            </button>
          </div>
        )}
      </div>
    );
  };
  return (
    <>
      <div className="hello disp">Hi {rep}</div>
      <div className="sub">HOP Concierge Rep · You only see jobs dispatch sends you</div>
      <div className="grid2">
        <div className="tile"><b style={{ fontSize: 22, fontFamily: "Montserrat" }}>{doneToday}</b><span>Done today</span></div>
        {/* Sample: no ratings are collected yet. */}
        <div className="tile"><b style={{ fontSize: 22, fontFamily: "Montserrat" }}>4.9</b><span>Member rating</span></div>
      </div>
      <div className="sect"><h2>New offers</h2><span className="tag g">{offers.length}</span></div>
      {offers.length ? offers.map(card) : <p className="mock" style={{ textAlign: "left" }}>{loaded ? "No new offers right now. New jobs from dispatch land here." : "Loading your jobs..."}</p>}
      <div className="sect"><h2>My jobs</h2></div>
      {active.map(card)}
    </>
  );
}

function JobDetail({ job: j, repFirst, update, say, thread }: { job: Job; repFirst: string; update: Update; say: (j: Job, who: "me" | "them", t: string) => void; thread: Threads[string] }) {
  const { toast, openSheet, closeSheet } = usePhone();
  const [upx, setUpx] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // The latest job, for async callbacks (uploads, the door approval timer) that outlive a render.
  const latest = useRef(j);
  latest.current = j;
  const first = firstName(j.client);
  const proofOk = (!j.needPhoto || j.photos.length > 0) && (!j.needSig || !!j.sig);
  const [pill, cls] = statusPill(j);
  const set = (p: Partial<Job>) => update(j.id, p).catch((e) => {
    toast(errMsg(e));
    throw e;
  });
  const quiet = (p: Promise<unknown>) => p.catch(() => {});
  const addUpdate = (text: string, extra: Partial<Job> = {}) => set({ updates: [...latest.current.updates, [nowT(), text]], ...extra });
  const step = (s: JobStatus, label: string, done?: string) =>
    quiet(set({ status: s, log: [...j.log, [nowT(), label]], updates: [...j.updates, [nowT(), "Client notified: " + label]] }).then(() => done && toast(done)));

  const next: Record<string, [string, () => void]> = {
    offer: ["Accept job", () => step("accepted", "Accepted")],
    accepted: ["Start task", () => step("started", "Started", "Task started. Client is tracking you.")],
    started: ["Arrived · in progress", () => step("in_progress", "In progress · arrived")],
    in_progress: [
      "Complete task",
      () => {
        if (j.needPhoto && !j.photos.length) return toast("Add a completion photo first.");
        if (j.needSig && !j.sig) return toast("Get a delivery signature first.");
        quiet(
          set({ status: "completed", attn: null, log: [...j.log, [nowT(), "Completed and verified"]], updates: [...j.updates, [nowT(), "Client notified: Completed and verified"]] }).then(() =>
            toast("Done. Proof sent to " + first + ".")
          )
        );
      }
    ]
  };

  /** Uploads first, then saves the URL on the job. `set` already toasts a failed save. */
  const saveProof = async (dataUrl: string, kind: "photo" | "signature", save: (url: string) => Promise<unknown>) => {
    setBusy(true);
    try {
      let url: string;
      try {
        url = (await upload(dataUrl, kind, j.id)).url;
      } catch (e) {
        toast(errMsg(e));
        return false;
      }
      return await save(url).then(() => true, () => false);
    } finally {
      setBusy(false);
    }
  };
  const addPhoto = async (dataUrl: string) => {
    if (latest.current.photos.length >= MAX_PHOTOS) return toast(`Up to ${MAX_PHOTOS} photos per job.`);
    if (await saveProof(dataUrl, "photo", (url) => addUpdate("Completion photo added", { photos: [...latest.current.photos, url] }))) toast("Photo added to the job.");
  };

  const door = j.door;
  const doorAct = (state: NonNullable<Job["door"]>["state"], text: string, upd?: string) => {
    const d = latest.current.door;
    if (!d) return Promise.reject(new Error("No door"));
    const log: LogEntry[] = [...(d.log || []), [nowT(), text]];
    return set({ door: { ...d, state, log }, ...(upd ? { updates: [...latest.current.updates, [nowT(), upd]] } : {}) });
  };
  const doorApi = async (action: "unlock" | "lock") => {
    setBusy(true);
    try {
      await api("/api/door", { method: "POST", body: JSON.stringify({ jobId: j.id, action }) });
      return true;
    } catch (e) {
      toast(errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  };
  const active = j.status === "accepted" || j.status === "started" || j.status === "in_progress";

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
          <button className="btn o" style={{ marginTop: 10, padding: "7px 12px", fontSize: 12 }} onClick={() => quiet(addUpdate("Resolved: " + j.attn!.r, { attn: null }))}>Resolved, continue</button>
        </div>
      )}

      {j.status === "completed" ? (
        <div className="card" style={{ background: "#e2f4e8", borderColor: "#bfe3cb" }}>
          <h3>✓ Completed and verified</h3>
          <p>Proof sent to {first} and the concierge console.</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {j.photos[0] && <img src={j.photos[0]} alt="Completion photo" style={{ width: "100%", borderRadius: 12, marginTop: 10 }} />}
          {j.sig && (
            <div style={{ background: "#fff", borderRadius: 12, marginTop: 8, padding: 6 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={j.sig} alt="Signature" style={{ width: "100%", height: 90, objectFit: "contain" }} />
              <small style={{ fontSize: 11.5, color: "var(--muted)" }}>Signed by {j.signedBy || "recipient"}</small>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="row" style={{ gap: 8, marginBottom: 12 }}>
            <button className={`btn ${j.status === "in_progress" && !proofOk ? "o" : "p"} w`} style={{ flex: 1 }} onClick={next[j.status]?.[1]}>{next[j.status]?.[0]}</button>
            <button
              className="btn o"
              aria-label="Needs attention"
              onClick={() =>
                openSheet(
                  <AttnSheet
                    onSend={(r, n) => {
                      say(j, "me", "Heads up: " + r + (n ? ". " + n : ""));
                      quiet(addUpdate("Needs attention: " + r + (n ? " · " + n : ""), { attn: n ? { r, n } : { r } }).then(() => toast("Alert sent to the client and concierge lead.")));
                      closeSheet();
                    }}
                  />
                )
              }
            >
              ⚠️
            </button>
          </div>
          {j.status === "in_progress" && !proofOk && <p className="mock" style={{ margin: "-6px 0 12px", textAlign: "left" }}>Add the required proof below to complete.</p>}
        </>
      )}

      <div className="card">
        <small className="kick">Client</small>
        <h3 style={{ marginTop: 6 }}>{j.client}</h3>
        <p style={{ fontSize: 12.5 }}>{j.crole} · {j.phoneTxt}</p>
        <div className="moods" style={{ margin: "8px 0" }}>{j.prefs.map((p) => <span key={p} className="chip" style={{ cursor: "default", fontSize: 12, padding: "5px 10px" }}>{p}</span>)}</div>
        {/* TODO(IT): swap tel:/sms: for the masked number from POST /api/calls once Twilio is wired. */}
        <div className="cact">
          <a className="btn n" href={`tel:${j.phone}`}>📞 Call</a>
          <a className="btn o" href={`sms:${j.phone}`}>💬 Text</a>
          <button className="btn o" onClick={() => openSheet(<ChatSheet job={j} thread={thread} say={say} />)}>Chat</button>
        </div>
        <p className="mock" style={{ textAlign: "left" }}>Calls and texts go through a masked HOP number so personal numbers stay private. [CONFIRM phone provider]</p>
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
        {j.items.length > 0 && <p className="kick" style={{ marginTop: 10 }}>Checklist</p>}
        {j.items.map((it, i) => (
          <button key={i} className={`chk ${j.done[i] ? "on" : ""}`} onClick={() => quiet(set({ done: { ...j.done, [i]: !j.done[i] } }))}>
            <span>{j.done[i] ? "✓" : ""}</span>{it}
          </button>
        ))}
        {j.notes && <div className="instr"><b>Special instructions</b><p>{j.notes}</p></div>}
      </div>

      {door && (
        <div className="card door">
          <div className="row between">
            <div className="row"><div className="ico nv">🚪</div><div><h3>Smart door access</h3><p style={{ fontSize: 12.5 }}>{door.kind}</p></div></div>
            <span className={`tag ${{ idle: "g", asked: "g", ok: "s", open: "c", closed: "" }[door.state]}`}>
              {{ idle: "Access not requested", asked: "Waiting for client approval", ok: "Approved for this delivery window", open: "Unlocked · relocks in 10 min", closed: "Locked again" }[door.state]}
            </span>
          </div>
          <div style={{ marginTop: 12 }}>
            {!active && j.status !== "completed" && <p className="mock" style={{ textAlign: "left", marginTop: 0 }}>Accept the job to use door access.</p>}
            {active && door.state === "idle" && (
              <button
                className="btn n w"
                onClick={() => {
                  quiet(doorAct("asked", "Access requested from " + first));
                  // TODO(IT): real approval comes from the member's app or watch. Simulated here.
                  setTimeout(() => {
                    quiet(doorAct("ok", first + " approved access for this window").then(() => toast("Client approved door access.")));
                  }, 1800);
                }}
              >
                Request access from client
              </button>
            )}
            {active && door.state === "asked" && <button className="btn o w" disabled>Waiting...</button>}
            {active && (door.state === "ok" || door.state === "closed") && (
              <button
                className="btn p w"
                disabled={busy}
                onClick={async () => {
                  if (!(await doorApi("unlock"))) return;
                  quiet(doorAct("open", "Door unlocked by " + repFirst + ", HOP rep", "Door unlocked, entering now"));
                  toast("Door unlocked. It relocks in 10 minutes.");
                }}
              >
                🔓 Unlock door
              </button>
            )}
            {active && door.state === "open" && (
              <button
                className="btn n w"
                disabled={busy}
                onClick={async () => {
                  if (!(await doorApi("lock"))) return;
                  quiet(doorAct("closed", "Door locked", "Door locked behind me"));
                  toast("Door locked. Logged for the client.");
                }}
              >
                🔒 Lock door now
              </button>
            )}
          </div>
          {door.log && <Timeline items={door.log} />}
          <p className="mock" style={{ textAlign: "left" }}>Access works only inside the approved window, and every unlock is logged and shared with the client. [CONFIRM smart lock partners]</p>
        </div>
      )}

      <div className="card">
        <div className="row between"><small className="kick">Tracking updates to client</small><button className={`toggle ${j.share ? "on" : ""}`} aria-label="Share live location" onClick={() => quiet(set({ share: !j.share }))} /></div>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>{j.share ? "Live location shared while this job is active" : "Live location off"}</p>
        <div className="moods" style={{ margin: "0 0 8px" }}>
          {QUICK.map((u) => (
            <button key={u} className="chip" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => { say(j, "me", u); quiet(addUpdate("Sent: " + u).then(() => toast("Update sent to " + first + "."))); }}>{u}</button>
          ))}
        </div>
        <div className="row" style={{ gap: 6 }}>
          <input className="field" value={upx} onChange={(e) => setUpx(e.target.value)} placeholder="Custom update" maxLength={500} style={{ padding: "9px 12px" }} />
          <button
            className="btn n"
            style={{ padding: "9px 12px" }}
            onClick={() => {
              const v = upx.trim();
              if (!v) return;
              say(j, "me", v);
              quiet(addUpdate("Sent: " + v).then(() => toast("Update sent.")));
              setUpx("");
            }}
          >
            Send
          </button>
        </div>
        <Timeline items={[...j.log.map(([t, x]) => [t, "Status: " + x] as LogEntry), ...j.updates]} />
      </div>

      <div className="card">
        <small className="kick">Proof of completion</small>
        <div className="row between" style={{ marginTop: 8 }}>
          <div><b style={{ fontSize: 14 }}>📷 Photo verification</b><small style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{j.needPhoto ? "Required" : "Optional"} · {j.photos.length} added</small></div>
          {active && (
            <div className="row" style={{ gap: 6 }}>
              <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Saving..." : "Take photo"}</button>
              <button className="btn o" style={{ padding: "7px 10px", fontSize: 12 }} disabled={busy} onClick={() => addPhoto(samplePhoto())}>Sample</button>
            </div>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          capture="environment"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            try {
              await addPhoto(await downscalePhoto(f));
            } catch (err) {
              toast(errMsg(err));
            }
          }}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {j.photos.length > 0 && <div className="thumbs">{j.photos.map((p, i) => <img key={i} src={p} alt="Proof photo" />)}</div>}
        <div className="row between" style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
          <div><b style={{ fontSize: 14 }}>✍️ Delivery signature</b><small style={{ display: "block", fontSize: 12, color: "var(--muted)" }}>{j.needSig ? "Required" : "Optional"} · {j.sig ? "Signed by " + (j.signedBy || "recipient") : "Not signed"}</small></div>
          {active && (
            <button
              className={`btn ${j.sig ? "o" : "p"}`}
              style={{ padding: "7px 12px", fontSize: 12 }}
              onClick={() =>
                openSheet(
                  <SignaturePad
                    title={`${j.title} for ${j.client}`}
                    onError={toast}
                    onSave={async (png, name) => {
                      if (!(await saveProof(png, "signature", (url) => addUpdate("Signature captured from " + name, { sig: url, signedBy: name })))) return;
                      closeSheet();
                      toast("Signature saved to the job.");
                    }}
                  />
                )
              }
            >
              {j.sig ? "Redo" : "Sign"}
            </button>
          )}
        </div>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {j.sig && <img src={j.sig} alt="Signature" style={{ width: "100%", height: 80, objectFit: "contain", background: "var(--cream)", borderRadius: 12, marginTop: 8 }} />}
        {j.status === "offer" && <p className="mock" style={{ textAlign: "left" }}>Accept the job to add proof.</p>}
      </div>

      <div className="card">
        <small className="kick">Rep notes</small>
        {j.notesList.map((n, i) => <p key={i} style={{ fontSize: 13, color: "var(--ink)", marginTop: 6 }}>• {n}</p>)}
        <div className="row" style={{ gap: 6, marginTop: 8 }}>
          <input className="field" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Add a note for the team" maxLength={600} style={{ padding: "9px 12px" }} />
          <button
            className="btn o"
            style={{ padding: "9px 12px" }}
            onClick={() => {
              if (!note.trim()) return;
              quiet(set({ notesList: [...j.notesList, note.trim()] }));
              setNote("");
            }}
          >
            Add
          </button>
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
      <textarea className="field" rows={3} value={n} maxLength={600} onChange={(e) => setN(e.target.value)} placeholder="What do you need? For example: pharmacy says refill is not ready until 4:30" />
      <button className="btn c w" style={{ marginTop: 10 }} onClick={() => onSend(r, n.trim())}>Send alert</button>
    </div>
  );
}

/** Sample in-app chat from the mockup. Messages live in memory only. TODO(IT): realtime messaging. */
function ChatSheet({ job: j, thread, say }: { job: Job; thread: Threads[string]; say: (j: Job, who: "me" | "them", t: string) => void }) {
  const [msgs, setMsgs] = useState(thread);
  const [v, setV] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (box.current) box.current.scrollTop = box.current.scrollHeight;
  }, [msgs]);
  const send = () => {
    const t = v.trim();
    if (!t) return;
    setMsgs((m) => [...m, ["me", t]]);
    say(j, "me", t);
    setV("");
    setTimeout(() => {
      setMsgs((m) => [...m, ["them", "Thank you so much!"]]);
      say(j, "them", "Thank you so much!");
    }, 900);
  };
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="avatar" style={{ background: "var(--sky)" }}>{j.client[0]}</div>
        <div><h2 className="disp" style={{ color: "var(--navy)", fontSize: 18 }}>{j.client}</h2><p style={{ fontSize: 12.5, color: "var(--muted)" }}>{j.title}</p></div>
      </div>
      <div className="chat" ref={box}>{msgs.map(([who, t], i) => <div key={i} className={`bub ${who === "me" ? "me" : "ai"}`}>{t}</div>)}</div>
      <div className="row" style={{ gap: 6 }}>
        <input className="field" value={v} onChange={(e) => setV(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder={"Message " + firstName(j.client)} style={{ padding: "10px 12px" }} />
        <button className="btn n" onClick={send}>Send</button>
      </div>
      <p className="mock">Sample conversation. In-app chat isn&apos;t connected yet.</p>
    </div>
  );
}

export function Timeline({ items }: { items: LogEntry[] }) {
  if (!items.length) return null;
  return <div className="tl" style={{ marginTop: 12 }}>{items.map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}</div>;
}

function Inbox({ jobs, thread, say }: { jobs: Job[]; thread: (j: Job) => Threads[string]; say: (j: Job, who: "me" | "them", t: string) => void }) {
  const { openSheet } = usePhone();
  return (
    <>
      <div className="hello disp">Inbox</div>
      <div className="sub">Messages with members and the concierge lead.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {jobs.filter((j) => j.status !== "offer").map((j) => {
          const t = thread(j);
          return (
            <div className="it" key={j.id} style={{ cursor: "pointer" }} onClick={() => openSheet(<ChatSheet job={j} thread={t} say={say} />)}>
              <div className="avatar" style={{ background: "var(--sky)" }}>{j.client[0]}</div>
              <div className="grow"><b>{j.client}</b><small>{t[t.length - 1][1].slice(0, 48)}</small></div>
              <span style={{ color: "var(--muted)" }}>›</span>
            </div>
          );
        })}
        <div className="it">
          <div className="avatar" style={{ background: "var(--navy)" }}>HQ</div>
          <div className="grow"><b>Concierge lead</b><small>Great work today. Two more offers coming at 4.</small></div>
        </div>
      </div>
      <p className="mock">Sample messages. TODO(IT): connect to your realtime messaging provider.</p>
    </>
  );
}

function MeTab({ name, done }: { name: string; done: number }) {
  const { toast } = usePhone();
  // UI only: availability isn't sent to dispatch yet. [CONFIRM how reps go on/off shift]
  const [on, setOn] = useState(true);
  const [shift, setShift] = useState<Record<number, boolean>>({});
  return (
    <>
      <div className="hello disp">{name}</div>
      <div className="sub">HOP Concierge Rep</div>
      <div className="card">
        <div className="row between">
          <div><h3>{on ? "You are online" : "You are offline"}</h3><p>{on ? "New job offers will come to you." : "Go online to get offers."}</p></div>
          <button className={`toggle ${on ? "on" : ""}`} aria-label="Online" onClick={() => setOn(!on)} />
        </div>
      </div>
      <div className="grid2">
        <div className="tile"><b style={{ fontSize: 20, fontFamily: "Montserrat" }}>{done}</b><span>Completed today</span></div>
        <div className="tile"><b style={{ fontSize: 20, fontFamily: "Montserrat" }}>4.9</b><span>Member rating · sample</span></div>
      </div>
      <div className="sect"><h2>Start of shift</h2></div>
      <div className="card list">
        {SHIFT.map((x, i) => (
          <button key={x} className={`chk ${shift[i] ? "on" : ""}`} style={{ border: 0 }} onClick={() => setShift((s) => ({ ...s, [i]: !s[i] }))}>
            <span>{shift[i] ? "✓" : ""}</span>{x}
          </button>
        ))}
      </div>
      <button className="btn c w" style={{ marginTop: 4 }} onClick={() => toast("Concierge lead is calling you now. Location shared.")}>Safety help</button>
      <p className="mock">Connects you to the concierge lead and shares your location. [CONFIRM safety process]</p>
      <SignOutButton className="btn o w" style={{ marginTop: 12, padding: "12px 16px", fontSize: 14 }} />
    </>
  );
}
