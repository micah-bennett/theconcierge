"use client";
import { type ReactNode, useCallback, useEffect, useRef, useState } from "react";
import { ApiError, j as api, messagesApi, useJobs } from "@hop/shared/client";
import { nowT } from "@hop/shared/time";
import type { Door, Job, JobStatus, LogEntry, ThreadKind, ThreadSummary } from "@hop/shared/types";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import { MessageThread } from "@hop/shared/ui/MessageThread";
import { ICONS, Phone, usePhone } from "@hop/shared/ui/Phone";
import { SignaturePad } from "@hop/shared/ui/SignaturePad";
import { StatusSteps, statusPill } from "@hop/shared/ui/StatusSteps";
import { downscalePhoto } from "@/lib/image";

/*
 * Concierge Rep App, ported from prototype/starter/components/rep/RepApp.tsx.
 * Everything on screen comes from the server: jobs (GET /api/jobs, 4 s poll), the rep's
 * availability, rating and done-today count (GET /api/me), and messages (/api/messages).
 * Door access goes through POST /api/door; the member approves it in HOP Client.
 */

type Me = { id: string; first: string; name: string; initials: string };
type Availability = "online" | "offline";
type Stats = { availability: Availability; rating: { avg: number | null; count: number }; doneToday: number; supportPhone: string | null };
type Update = (id: string, p: Partial<Job>) => Promise<Job>;

const ATTN = ["Item out of stock", "Cannot reach client", "Address or entry issue", "Door access problem", "Need more details", "Safety concern"];
const QUICK = ["On my way", "Picked up", "Arrived", "Running 10 min late", "All done"];
const SHIFT = ["Badge and ID on", "Phone charged, car charger in", "Vehicle check done", "Insulated bags in the car"];
const MAX_PHOTOS = 6;
const ACTIVE: JobStatus[] = ["accepted", "started", "in_progress"];
const maps = (q: string) => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
const firstName = (s: string) => s.split(" ")[0];
const errMsg = (e: unknown) => (e instanceof ApiError || e instanceof Error ? e.message : "Something went wrong. Try again.");
const big = { fontSize: 22, fontFamily: "Montserrat" } as const;

function upload(dataUrl: string, kind: "photo" | "signature", jobId: string) {
  return api<{ url: string }>("/api/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind, jobId }) });
}

/** GET /api/me every 30 s (and on demand): availability, rating, done today, HOP line. */
function useStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const refresh = useCallback(async () => {
    try {
      setStats(await api<Stats>("/api/me"));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 30000);
    return () => clearInterval(t);
  }, [refresh]);
  return { stats, setStats, refresh };
}

/** The inbox list, polled every 6 s for unread counts. */
function useThreads() {
  const [threads, setThreads] = useState<ThreadSummary[] | null>(null);
  const refresh = useCallback(async () => {
    try {
      setThreads((await messagesApi.threads()).threads);
    } catch {
      /* keep the last list; the jobs poll shows the connection state */
    }
  }, []);
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 6000);
    return () => clearInterval(t);
  }, [refresh]);
  return { threads, refresh };
}

export default function RepApp({ me }: { me: Me }) {
  const [tab, setTab] = useState("jobs");
  const [cur, setCur] = useState<string | null>(null);
  const { jobs, setJobs, online, update, loaded } = useJobs();
  const { stats, setStats, refresh: refreshStats } = useStats();
  const { threads, refresh: refreshThreads } = useThreads();
  const mine = jobs.filter((j) => j.status !== "declined");
  const job = mine.find((j) => j.id === cur) ?? mine.find((j) => j.status !== "offer" && j.status !== "completed") ?? mine[0];
  const unread = (threads ?? []).reduce((n, t) => n + t.unread, 0);
  const replace = useCallback((saved: Job) => setJobs((all) => all.map((x) => (x.id === saved.id ? saved : x))), [setJobs]);

  const tabs = [
    { key: "jobs", label: "Jobs", icon: ICONS.plan },
    { key: "job", label: "Active", icon: ICONS.check },
    { key: "inbox", label: unread ? `Inbox (${unread})` : "Inbox", icon: ICONS.chat },
    { key: "me", label: "Me", icon: ICONS.heart }
  ];

  return (
    <div className="stage" style={{ display: "flex" }}>
      <aside className="side left">
        <h1>The field app for HOP concierge reps</h1>
        <p>Accept the job, know the client, call the vendor, keep the member posted, open the door safely, and prove it was done.</p>
        <p style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>Signed in as {me.name}</p>
        <SignOutButton />
        <p style={{ fontSize: 12.5, color: "var(--muted)", marginTop: 10 }}>
          {online === null ? "Connecting to dispatch..." : online ? "Live · connected to dispatch" : "Reconnecting to dispatch..."}
        </p>
      </aside>
      <Phone tabs={tabs} tab={tab} onTab={setTab}>
        <Top availability={stats?.availability ?? null} live={online} initials={me.initials} />
        {tab === "jobs" && (
          <JobsList loaded={loaded} rep={me.first} jobs={mine} stats={stats} onOpen={(id) => { setCur(id); setTab("job"); }} update={update} goMe={() => setTab("me")} />
        )}
        {tab === "job" &&
          (job ? (
            <JobDetail key={job.id} job={job} meId={me.id} update={update} replace={replace} onCompleted={refreshStats} />
          ) : (
            <p className="sub">{loaded ? "No jobs yet. New jobs from dispatch land on the Jobs tab." : "Loading your jobs..."}</p>
          ))}
        {tab === "inbox" && <Inbox meId={me.id} jobs={mine} threads={threads} onSeen={refreshThreads} />}
        {tab === "me" && <MeTab me={me} stats={stats} setStats={setStats} />}
      </Phone>
      <aside className="side right" />
    </div>
  );
}

function Top({ availability, live, initials }: { availability: Availability | null; live: boolean | null; initials: string }) {
  return (
    <div className="top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="HOP" />
      <div className="row" style={{ gap: 8 }}>
        <small style={{ fontSize: 11, fontWeight: 700, color: live === false ? "var(--coral)" : "var(--muted)" }}>{live === false ? "Reconnecting" : live ? "Live" : ""}</small>
        {availability && <span className={`tag ${availability === "online" ? "" : "g"}`}>{availability === "online" ? "● Online" : "Offline"}</span>}
        <div className="avatar" style={{ background: "var(--teal)" }}>{initials}</div>
      </div>
    </div>
  );
}

function RatingTile({ stats, label = "Member rating" }: { stats: Stats | null; label?: string }) {
  const r = stats?.rating;
  return (
    <div className="tile">
      <b style={{ ...big, fontSize: r?.count ? 22 : 15 }}>{!stats ? "…" : r?.count ? `${r.avg?.toFixed(1)} ★` : "No ratings yet"}</b>
      <span>{r?.count ? `${label} · ${r.count} ${r.count === 1 ? "rating" : "ratings"}` : label}</span>
    </div>
  );
}

function JobsList({
  rep,
  jobs,
  loaded,
  stats,
  onOpen,
  update,
  goMe
}: {
  rep: string;
  jobs: Job[];
  loaded: boolean;
  stats: Stats | null;
  onOpen: (id: string) => void;
  update: Update;
  goMe: () => void;
}) {
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
                  .then(() => toast("Job accepted. " + firstName(j.client) + " can see it in HOP Client."))
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
                  .then(() => toast("Passed. It's back with dispatch."))
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
      {stats?.availability === "offline" && (
        <div className="card" style={{ background: "#fbf0dc", borderColor: "#f1d9a8", cursor: "pointer" }} onClick={goMe}>
          <h3>You&apos;re offline</h3>
          <p>Dispatch sees you as offline. Your current jobs stay here. Go online in Me when you&apos;re ready for offers.</p>
        </div>
      )}
      <div className="grid2">
        <div className="tile"><b style={big}>{stats ? stats.doneToday : "…"}</b><span>Done today</span></div>
        <RatingTile stats={stats} />
      </div>
      <div className="sect"><h2>New offers</h2><span className="tag g">{offers.length}</span></div>
      {offers.length ? offers.map(card) : <p className="mock" style={{ textAlign: "left" }}>{loaded ? "No new offers right now. New jobs from dispatch land here." : "Loading your jobs..."}</p>}
      <div className="sect"><h2>My jobs</h2></div>
      {active.map(card)}
    </>
  );
}

const DOOR_TAG: Record<Door["state"], string> = { idle: "g", asked: "g", ok: "s", denied: "c", open: "c", closed: "" };

function JobDetail({ job: j, meId, update, replace, onCompleted }: { job: Job; meId: string; update: Update; replace: (j: Job) => void; onCompleted: () => void }) {
  const { toast, openSheet, closeSheet } = usePhone();
  const [upx, setUpx] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  // The latest job, for async callbacks (uploads) that outlive a render.
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
    accepted: ["Start task", () => step("started", "Started", `Task started. ${first} can follow along in HOP Client.`)],
    started: ["Arrived · in progress", () => step("in_progress", "In progress · arrived")],
    in_progress: [
      "Complete task",
      () => {
        if (j.needPhoto && !j.photos.length) return toast("Add a completion photo first.");
        if (j.needSig && !j.sig) return toast("Get a delivery signature first.");
        quiet(
          set({ status: "completed", attn: null, log: [...j.log, [nowT(), "Completed and verified"]], updates: [...j.updates, [nowT(), "Client notified: Completed and verified"]] }).then(() => {
            toast("Done. Proof sent to " + first + ".");
            onCompleted();
          })
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
  /** POST /api/door. The server moves the door state; the reply carries the saved job. */
  const doorApi = async (action: "ask" | "unlock" | "lock", done: string) => {
    setBusy(true);
    try {
      const res = await api<{ job: Job }>("/api/door", { method: "POST", body: JSON.stringify({ jobId: j.id, action }) });
      replace(res.job);
      toast(done);
    } catch (e) {
      toast(errMsg(e));
    } finally {
      setBusy(false);
    }
  };
  // Tell the rep when the member answers (picked up by the 4 s job poll).
  const prevDoor = useRef(door?.state);
  useEffect(() => {
    if (prevDoor.current === "asked" && door?.state === "ok") toast(`${first} approved door access.`);
    if (prevDoor.current === "asked" && door?.state === "denied") toast(`${first} declined door access.`);
    prevDoor.current = door?.state;
  }, [door?.state, first, toast]);
  const active = ACTIVE.includes(j.status);
  const doorLabel: Record<Door["state"], string> = {
    idle: "Access not requested",
    asked: `Waiting for ${first}`,
    ok: `Approved by ${first}`,
    denied: "Declined",
    open: "Unlocked",
    closed: "Locked again"
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
          <p>{j.attn.n || "Dispatch can see this on the job."}</p>
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
                    first={first}
                    onSend={(r, n) => {
                      quiet(addUpdate("Needs attention: " + r + (n ? " · " + n : ""), { attn: n ? { r, n } : { r } }).then(() => toast("Flagged for dispatch and " + first + ".")));
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
        <p style={{ fontSize: 12.5 }}>{j.crole}{j.phoneTxt ? " · " + j.phoneTxt : ""}</p>
        {j.prefs.length > 0 && <div className="moods" style={{ margin: "8px 0" }}>{j.prefs.map((p) => <span key={p} className="chip" style={{ cursor: "default", fontSize: 12, padding: "5px 10px" }}>{p}</span>)}</div>}
        {/* TODO(IT): swap tel:/sms: for the masked number from POST /api/calls once Twilio is wired. */}
        <div className="cact">
          {j.phone && <a className="btn n" href={`tel:${j.phone}`}>📞 Call</a>}
          {j.phone && <a className="btn o" href={`sms:${j.phone}`}>💬 Text</a>}
          <button className="btn o" onClick={() => openSheet(<ChatSheet job={j} meId={meId} onError={toast} />)}>Chat</button>
        </div>
        {j.phone && <p className="mock" style={{ textAlign: "left" }}>Call and Text use the member&apos;s own number for now. TODO(IT): masked HOP numbers. [CONFIRM phone provider]</p>}
      </div>

      {j.vendor && (
        <div className="card">
          <small className="kick">Vendor</small>
          <div className="row between" style={{ marginTop: 6 }}>
            <div><h3>{j.vendor.name}</h3><p style={{ fontSize: 12.5 }}>{j.vendor.contact} · {j.vendor.phoneTxt}</p></div>
            {j.vendor.phone && <a className="btn o" style={{ padding: "8px 12px" }} href={`tel:${j.vendor.phone}`}>📞 Call</a>}
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
            <span className={`tag ${DOOR_TAG[door.state]}`}>{doorLabel[door.state]}</span>
          </div>
          <div style={{ marginTop: 12 }}>
            {!active && j.status !== "completed" && <p className="mock" style={{ textAlign: "left", marginTop: 0 }}>Accept the job to use door access.</p>}
            {active && door.state === "idle" && (
              <button className="btn n w" disabled={busy} onClick={() => doorApi("ask", `Asked ${first} for door access.`)}>Ask the member</button>
            )}
            {active && door.state === "asked" && <p style={{ fontSize: 13.5 }}>Waiting for {first} to approve in HOP Client…</p>}
            {active && door.state === "denied" && (
              <>
                <p style={{ fontSize: 13.5, marginBottom: 10 }}>The member declined door access. Leave it with them or ask dispatch.</p>
                <button className="btn o w" disabled={busy} onClick={() => doorApi("ask", `Asked ${first} again.`)}>Ask again</button>
              </>
            )}
            {active && (door.state === "ok" || door.state === "closed") && (
              <button className="btn p w" disabled={busy} onClick={() => doorApi("unlock", "Door unlock logged for " + first + ".")}>🔓 Unlock door</button>
            )}
            {active && door.state === "open" && (
              <button className="btn n w" disabled={busy} onClick={() => doorApi("lock", "Door lock logged for " + first + ".")}>🔒 Lock door now</button>
            )}
          </div>
          {door.log && <Timeline items={door.log} />}
          <p className="mock" style={{ textAlign: "left" }}>
            {first} approves each request in HOP Client, and every unlock and lock is logged for them. TODO(IT): the smart lock itself isn&apos;t connected yet, so use the entry the member gave you. [CONFIRM smart lock partners]
          </p>
        </div>
      )}

      <div className="card">
        <small className="kick">Updates to {first}</small>
        <p style={{ fontSize: 12, margin: "4px 0 8px" }}>{first} sees these in HOP Client.</p>
        <div className="moods" style={{ margin: "0 0 8px" }}>
          {QUICK.map((u) => (
            <button key={u} className="chip" style={{ fontSize: 12, padding: "6px 10px" }} onClick={() => quiet(addUpdate(u).then(() => toast("Update sent to " + first + ".")))}>{u}</button>
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
              quiet(addUpdate(v).then(() => toast("Update sent to " + first + ".")));
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
            <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} disabled={busy} onClick={() => fileRef.current?.click()}>{busy ? "Saving..." : "Take photo"}</button>
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

function AttnSheet({ first, onSend }: { first: string; onSend: (r: string, n: string) => void }) {
  const [r, setR] = useState(ATTN[4]);
  const [n, setN] = useState("");
  return (
    <div>
      <h2 className="disp" style={{ color: "var(--navy)", fontSize: 20 }}>Needs special attention</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 12px" }}>Dispatch and {first} see this on the job right away.</p>
      <div className="moods" style={{ margin: "0 0 10px" }}>{ATTN.map((x) => <button key={x} className={`chip ${x === r ? "on" : ""}`} onClick={() => setR(x)}>{x}</button>)}</div>
      <textarea className="field" rows={3} value={n} maxLength={600} onChange={(e) => setN(e.target.value)} placeholder="What do you need? For example: pharmacy says refill is not ready until 4:30" />
      <button className="btn c w" style={{ marginTop: 10 }} onClick={() => onSend(r, n.trim())}>Send alert</button>
    </div>
  );
}

/** The job's chat with the member (thread job/<job id>), live from /api/messages. */
function ChatSheet({ job: j, meId, onError }: { job: Job; meId: string; onError: (m: string) => void }) {
  const first = firstName(j.client);
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="avatar" style={{ background: "var(--sky)" }}>{j.client[0]}</div>
        <div><h2 className="disp" style={{ color: "var(--navy)", fontSize: 18 }}>{j.client}</h2><p style={{ fontSize: 12.5, color: "var(--muted)" }}>{j.title}</p></div>
      </div>
      <MessageThread kind="job" threadKey={j.id} meId={meId} placeholder={"Message " + first} emptyText={`No messages yet. Say hello to ${first}.`} onError={onError} />
      <p className="mock">Messages go to {first} in HOP Client.</p>
    </div>
  );
}

/** The rep's own HQ thread (rep/<my id>) with the Console team. */
function HqSheet({ meId, onError }: { meId: string; onError: (m: string) => void }) {
  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="avatar" style={{ background: "var(--navy)" }}>HQ</div>
        <div><h2 className="disp" style={{ color: "var(--navy)", fontSize: 18 }}>HOP HQ</h2><p style={{ fontSize: 12.5, color: "var(--muted)" }}>The Console team</p></div>
      </div>
      <MessageThread kind="rep" threadKey={meId} meId={meId} placeholder="Message HOP HQ" emptyText="No messages yet. HOP HQ answers here." onError={onError} />
    </div>
  );
}

export function Timeline({ items }: { items: LogEntry[] }) {
  if (!items.length) return null;
  return <div className="tl" style={{ marginTop: 12 }}>{items.map(([t, x], i) => <div key={i}><small>{t}</small>{x}</div>)}</div>;
}

function Inbox({ meId, jobs, threads, onSeen }: { meId: string; jobs: Job[]; threads: ThreadSummary[] | null; onSeen: () => void }) {
  const { openSheet, toast } = usePhone();
  const byKey = (kind: ThreadKind, key: string) => threads?.find((t) => t.threadKind === kind && t.threadKey === key);
  const hq = byKey("rep", meId);
  // Job chats: every job thread with messages, plus my live jobs that don't have one yet.
  const jobIds = [
    ...(threads ?? []).filter((t) => t.threadKind === "job").map((t) => t.threadKey),
    ...jobs.filter((j) => ACTIVE.includes(j.status) && !byKey("job", j.id)).map((j) => j.id)
  ];
  const open = (node: ReactNode) => {
    openSheet(node);
    setTimeout(onSeen, 1500); // the thread marks itself read on load; refresh the badges
  };
  const row = (key: string, avatar: string, bg: string, title: string, t: ThreadSummary | undefined, empty: string, onClick: () => void) => (
    <div className="it" key={key} style={{ cursor: "pointer" }} onClick={onClick}>
      <div className="avatar" style={{ background: bg }}>{avatar}</div>
      <div className="grow">
        <b>{title}</b>
        <small style={t?.unread ? { fontWeight: 700, color: "var(--ink)" } : undefined}>{t ? (t.last.senderId === meId ? "You: " : "") + t.last.body.slice(0, 60) : empty}</small>
      </div>
      {t?.unread ? <span className="tag c">{t.unread}</span> : <span style={{ color: "var(--muted)" }}>›</span>}
    </div>
  );
  return (
    <>
      <div className="hello disp">Inbox</div>
      <div className="sub">HOP HQ and your members.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {row("hq", "HQ", "var(--navy)", "HOP HQ", hq, "Message the Console team any time", () => open(<HqSheet meId={meId} onError={toast} />))}
        {jobIds.map((id) => {
          const job = jobs.find((x) => x.id === id);
          const t = byKey("job", id);
          const title = job ? `${job.client} · ${job.title}` : t?.title ?? "Job chat";
          return row(id, (job?.client ?? title)[0], "var(--sky)", title, t, "No messages yet", () => {
            if (job) open(<ChatSheet job={job} meId={meId} onError={toast} />);
            else toast("This job isn't on your list anymore.");
          });
        })}
      </div>
      {threads === null && <p className="mock">Loading messages...</p>}
    </>
  );
}

/** The start-of-shift checklist is personal and lives only on this phone, reset each day. */
const shiftKey = (meId: string) => `hop-rep-shift:${meId}:${new Date().toLocaleDateString("en-CA", { timeZone: "America/New_York" })}`;
function useShiftChecklist(meId: string) {
  const [shift, setShift] = useState<Record<number, boolean>>({});
  useEffect(() => {
    try {
      const v = localStorage.getItem(shiftKey(meId));
      if (v) setShift(JSON.parse(v));
    } catch {
      /* storage blocked: start empty */
    }
  }, [meId]);
  const toggle = (i: number) =>
    setShift((s) => {
      const n = { ...s, [i]: !s[i] };
      try {
        localStorage.setItem(shiftKey(meId), JSON.stringify(n));
      } catch {
        /* storage blocked: keep it in memory */
      }
      return n;
    });
  return { shift, toggle };
}

function MeTab({ me, stats, setStats }: { me: Me; stats: Stats | null; setStats: (s: Stats) => void }) {
  const { toast, openSheet } = usePhone();
  const { shift, toggle } = useShiftChecklist(me.id);
  const [saving, setSaving] = useState(false);
  const on = stats?.availability === "online";
  const setAvailability = async () => {
    if (!stats || saving) return;
    const want: Availability = on ? "offline" : "online";
    setSaving(true);
    setStats({ ...stats, availability: want });
    try {
      await api("/api/me?action=availability", { method: "POST", body: JSON.stringify({ availability: want }) });
      toast(want === "online" ? "You're online. Dispatch can see you." : "You're offline. Your current jobs stay with you.");
    } catch (e) {
      setStats({ ...stats });
      toast(errMsg(e));
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <div className="hello disp">{me.name}</div>
      <div className="sub">HOP Concierge Rep</div>
      <div className="card">
        <div className="row between">
          <div>
            <h3>{!stats ? "Loading..." : on ? "You are online" : "You are offline"}</h3>
            <p>{on ? "Dispatch sees you as available for new offers." : "Go online so dispatch knows you're available. Current jobs stay with you either way."}</p>
          </div>
          <button className={`toggle ${on ? "on" : ""}`} aria-label={on ? "Go offline" : "Go online"} aria-pressed={on} disabled={!stats || saving} onClick={setAvailability} />
        </div>
      </div>
      <div className="grid2">
        <div className="tile"><b style={{ ...big, fontSize: 20 }}>{stats ? stats.doneToday : "…"}</b><span>Completed today</span></div>
        <RatingTile stats={stats} />
      </div>
      <div className="sect"><h2>Start of shift</h2></div>
      <p className="mock" style={{ textAlign: "left", margin: "-4px 0 8px" }}>Your personal checklist (saved on this device)</p>
      <div className="card list">
        {SHIFT.map((x, i) => (
          <button key={x} className={`chk ${shift[i] ? "on" : ""}`} style={{ border: 0 }} onClick={() => toggle(i)}>
            <span>{shift[i] ? "✓" : ""}</span>{x}
          </button>
        ))}
      </div>
      <button className="btn c w" style={{ marginTop: 4 }} onClick={() => openSheet(<SafetySheet supportPhone={stats?.supportPhone ?? null} />)}>Safety help</button>
      <p className="mock">Alerts HOP HQ right away with an urgent message and a Console alert. [CONFIRM safety process]</p>
      <SignOutButton className="btn o w" style={{ marginTop: 12, padding: "12px 16px", fontSize: 14 }} />
    </>
  );
}

const telHref = (n: string) => "tel:" + n.replace(/[^\d+]/g, "");

function SafetySheet({ supportPhone }: { supportPhone: string | null }) {
  const [note, setNote] = useState("");
  const [state, setState] = useState<"confirm" | "sending" | "sent">("confirm");
  const [err, setErr] = useState("");
  const [phone, setPhone] = useState(supportPhone);
  const send = async () => {
    setState("sending");
    setErr("");
    try {
      const res = await api<{ ok: true; supportPhone: string | null }>("/api/me?action=safety", { method: "POST", body: JSON.stringify(note.trim() ? { note: note.trim() } : {}) });
      setPhone(res.supportPhone);
      setState("sent");
    } catch (e) {
      setErr(errMsg(e));
      setState("confirm");
    }
  };
  const calls = (
    <>
      {phone && <a className="btn n w" style={{ marginTop: 10, display: "block", textAlign: "center" }} href={telHref(phone)}>📞 Call the HOP line</a>}
      <a className="btn o w" style={{ marginTop: 8, display: "block", textAlign: "center" }} href="tel:911">If you&apos;re in danger call 911</a>
    </>
  );
  if (state === "sent") {
    return (
      <div>
        <h2 className="disp" style={{ color: "var(--navy)", fontSize: 20 }}>HOP HQ has been alerted</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 6px" }}>The Console team has your urgent message and will reach you in your HOP HQ thread.</p>
        {calls}
      </div>
    );
  }
  return (
    <div>
      <h2 className="disp" style={{ color: "var(--navy)", fontSize: 20 }}>Need help?</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 12px" }}>This sends HOP HQ an urgent alert with your current job. Add a short note if you can.</p>
      <textarea className="field" rows={3} value={note} maxLength={400} onChange={(e) => setNote(e.target.value)} placeholder="What's happening? (optional)" />
      {err && <p style={{ color: "var(--coral)", fontSize: 13, marginTop: 6 }}>{err}</p>}
      <button className="btn c w" style={{ marginTop: 10 }} disabled={state === "sending"} onClick={send}>{state === "sending" ? "Alerting HOP HQ..." : "Alert HOP HQ now"}</button>
      {calls}
    </div>
  );
}
