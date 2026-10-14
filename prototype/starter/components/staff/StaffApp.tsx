"use client";
import { useEffect, useState } from "react";
import { Phone, usePhone, ICONS } from "@/components/ui/Phone";
import { JOB_TYPES } from "@/lib/brand";
import { api } from "@/lib/client";
import type { StaffRequest } from "@/lib/types";

const ROLES = [
  { id: "nurse", label: "ICU Nurse", name: "Jordan", full: "Jordan Reyes", role: "ICU Nurse" },
  { id: "doctor", label: "ER Doctor", name: "Dr. Patel", full: "Dr. Patel", role: "ER Doctor" },
  { id: "tech", label: "Imaging Tech", name: "Marcus", full: "Marcus Lee", role: "Imaging Tech" },
  { id: "aide", label: "Home Health Aide", name: "Rosa", full: "Rosa Diaz", role: "Home Health Aide" }
];
const TABS = [
  { key: "home", label: "Today", icon: ICONS.home },
  { key: "rewards", label: "Rewards", icon: ICONS.star },
  { key: "you", label: "You", icon: ICONS.heart },
  { key: "smart", label: "Home", icon: ICONS.homeSmart }
];
const EARN: Record<string, [string, string, string, number][]> = {
  daily: [["check", "💬", "Daily mood check in", 20], ["reset", "🧘", "Finish a Five Minute Reset", 15], ["lunch", "🥗", "Take your full lunch break", 25], ["water", "💧", "Hit your water goal", 10], ["rate", "⭐", "Rate a finished request", 10], ["thanks", "🙏", "Thank a teammate", 10]],
  weekly: [["shout", "🙌", "Give a peer a public shout out", 30], ["steps", "👟", "10k steps on three days", 40], ["sleep", "😴", "Seven hours of sleep three nights", 60], ["class", "🏋️", "Join a wellness class", 50], ["ceu", "🎓", "Finish a CEU module", 100], ["mentor", "🤝", "Mentor a new hire for a shift", 75], ["cover", "📅", "Cover an open shift", 75], ["pulse", "📝", "Answer the weekly pulse", 50]],
  big: [["pto", "🌴", "Take a full day off, phone down", 100], ["refer", "💌", "Refer a colleague who joins", 150], ["story", "📣", "Share your HOP story", 40], ["family", "👨‍👩‍👧", "Add family dates to Moments", 20], ["connect", "⌚", "Connect your watch", 50], ["profile", "🧠", "Teach HOP 3 things about you", 30], ["praise", "💙", "Get named in a patient thank you", 80], ["streak", "🔥", "Keep a 7 day check in streak", 70]]
};
const TIERS: [string, number, string][] = [["Bronze", 0, "Points on every request"], ["Silver", 2000, "Free ride home once a month"], ["Gold", 4000, "Priority concierge, answered first"], ["Platinum", 7000, "A monthly surprise from HOP"]];
const PREFS0 = [
  ["☕", "Coffee order", "Large oat milk latte, extra shot", "From 6 food requests", 92],
  ["🍜", "Go to dinner after nights", "Thai, mild, no peanuts", "From your orders", 88],
  ["💊", "Pharmacy", "Main Street pharmacy, pickup after 4 PM", "From errands", 95],
  ["🚸", "Approved pickup person", "David, or Ruth as backup", "You told HOP", 100],
  ["🌙", "Quiet hours", "8 AM to 3 PM after night shifts", "From your watch and schedule", 84],
  ["💬", "How to reach you", "Text first, call only if urgent", "From how you reply", 80]
] as const;
const SOURCES = ["What you do in HOP", "Your calendars", "Your watch", "Your work schedule", "Saved with HOP"];
const DEVICES = [["alexa", "🔵", "Amazon Alexa", "Voice requests, Echo Show tracking, smart locks"], ["apple", "🍎", "Apple", "Siri, Apple Watch, Live Activities, Apple Home"], ["google", "🟢", "Google and Android", "Google Assistant, widgets, Google Home"], ["lock", "🔐", "Smart lock or doorbell", "August, Yale, Schlage, or Ring"]];

export default function StaffApp() {
  const [role, setRole] = useState(ROLES[0]);
  const [tab, setTab] = useState("home");
  return (
    <div className="stage" style={{ display: "flex" }}>
      <aside className="side left">
        <h1>The HOP Portal for the people who keep healthcare running</h1>
        <p>One app for the whole care team, in and out of the hospital. Ask once, and HOP finds the help, tracks it, and confirms it is done.</p>
        <p style={{ fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>See it as</p>
        <div className="rolepick">{ROLES.map((r) => <button key={r.id} className={r.id === role.id ? "on" : ""} onClick={() => setRole(r)}>{r.label}</button>)}</div>
      </aside>
      <Phone tabs={TABS} tab={tab} onTab={setTab}>
        <div className="top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="HOP" />
          <div className="avatar">{role.name[0]}</div>
        </div>
        {tab === "home" && <Today role={role} />}
        {tab === "rewards" && <Rewards />}
        {tab === "you" && <KnowsYou />}
        {tab === "smart" && <SmartHome />}
      </Phone>
      <aside className="side right" />
    </div>
  );
}

function Today({ role }: { role: (typeof ROLES)[number] }) {
  const { toast, openSheet, closeSheet } = usePhone();
  const [mine, setMine] = useState<StaffRequest[]>([]);
  const [handled, setHandled] = useState<string[]>([]);
  const load = () => api.requests().then((l) => setMine(l.filter((r) => r.member === role.full))).catch(() => {});
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, [role.full]); // eslint-disable-line react-hooks/exhaustive-deps
  const ask = async (cat: string, text: string) => {
    await api.createRequest({ member: role.full, role: role.role, cat, text }).catch(() => null);
    load();
    toast("On it. Your concierge has it.");
  };
  const W = [
    ["cal", "📅", "From your calendar", "Aria's recital is tomorrow at 5. You are on until 7:30.", "Cover pickup and send flowers", "family", "Recital pickup and flowers"],
    ["watch", "🌙", "From your watch", "You slept 4h 50m. Rough one.", "Hold deliveries and send dinner at 6", "food", "Dinner at 6 PM and hold deliveries"],
    ["habit", "☕", "What HOP knows about you", "Third 12 hour shift in a row.", "Send your usual latte at 2 PM", "food", "Large oat milk latte at 2 PM"]
  ].filter((w) => !handled.includes(w[0]));
  return (
    <>
      <div className="hello disp">Hi {role.name}</div>
      <div className="sub">{role.role}</div>
      {W.length > 0 && (
        <div className="card welcome">
          <small className="kick" style={{ color: "#7fd3d4" }}>Welcome back</small>
          <h3 style={{ color: "#fff", fontSize: 17, marginTop: 2 }}>While you were away, HOP noticed</h3>
          {W.map((w) => (
            <div className="wb" key={w[0]}>
              <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 18 }}>{w[1]}</span>
                <div style={{ flex: 1 }}>
                  <small>{w[2]}</small><p>{w[3]}</p>
                  <button className="btn p" style={{ padding: "7px 12px", fontSize: 12, marginTop: 8 }} onClick={() => { setHandled([...handled, w[0]]); ask(w[5], w[6]); }}>{w[4]}</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      <button className="clutch" onClick={() => openSheet(
        <div>
          <h2 className="disp" style={{ color: "var(--navy)", fontSize: 21, textAlign: "center" }}>Clutch</h2>
          <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 14px", textAlign: "center" }}>What is on fire?</p>
          <div className="grid2">{["Late for a pickup", "Forgot a big date", "Locked out", "Car trouble", "Sick kid at school", "Need food right now"].map((x) => <button key={x} className="tile" onClick={() => { ask("errand", "Clutch: " + x); closeSheet(); }}><b style={{ fontSize: 13 }}>{x}</b></button>)}</div>
          <p className="mock">Clutch requests jump the line. A real person picks up. [CONFIRM Clutch hours]</p>
        </div>
      )}>
        <span className="cz">⚡</span>
        <span style={{ flex: 1, textAlign: "left" }}><b>In a bind? Hit Clutch.</b><small>HOP drops everything and calls you in 2 minutes</small></span>
      </button>
      <div className="card">
        <h3>Ask HOP for anything</h3>
        <div className="moods" style={{ marginTop: 10 }}>
          {JOB_TYPES.map((t) => <button key={t[0]} className="chip" onClick={() => ask(t[0], t[2] + " request")}>{t[1]} {t[2]}</button>)}
        </div>
        <p className="mock" style={{ textAlign: "left" }}>Requests go to the Concierge Console queue.</p>
      </div>
      <div className="sect"><h2>Your requests</h2></div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {mine.length ? mine.map((r) => (
          <div className="it" key={r.id}><div className="grow"><b style={{ fontSize: 13.5 }}>{r.text}</b><small>{r.status === "new" ? "Received · matching you with a rep" : "Dispatched · your rep is on it"}</small></div></div>
        )) : <p className="mock" style={{ textAlign: "left" }}>No requests yet.</p>}
      </div>
    </>
  );
}

function Rewards() {
  const { toast } = usePhone();
  const [points, setPoints] = useState(1240);
  const [life, setLife] = useState(4820);
  const [q, setQ] = useState("daily");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const t = TIERS.filter((x) => life >= x[1]).pop()!;
  const n = TIERS[TIERS.indexOf(t) + 1];
  const pct = n ? Math.round(((life - t[1]) / (n[1] - t[1])) * 100) : 100;
  return (
    <>
      <div className="hello disp">Rewards</div>
      <div className="sub">Rest is part of the job. HOP rewards it.</div>
      <div className="points"><small style={{ opacity: 0.8, fontWeight: 700, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Recharge Points</small><div className="num">{points.toLocaleString()}</div></div>
      <div className="card">
        <small className="kick">Your level</small>
        <h3 style={{ fontSize: 18 }}>{t[0]} member</h3><p style={{ fontSize: 12.5 }}>{t[2]}</p>
        <div className="pbar" style={{ marginTop: 10 }}><i style={{ width: pct + "%" }} /></div>
        <p style={{ fontSize: 12, marginTop: 6 }}>{n ? `${(n[1] - life).toLocaleString()} pts to ${n[0]} · ${n[2]}` : "Top level reached"}</p>
      </div>
      <div className="sect"><h2>Earn more points</h2></div>
      <div className="subtabs">{[["daily", "Today"], ["weekly", "This week"], ["big", "Big wins"]].map(([k, l]) => <button key={k} className={q === k ? "on" : ""} onClick={() => setQ(k)}>{l}</button>)}</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {EARN[q].map(([k, i, label, p]) => (
          <div className="it" key={k}>
            <div className="ico t">{i}</div>
            <div className="grow"><b style={{ fontSize: 13.5 }}>{label}</b><small>+{p} pts</small></div>
            {done[k] ? <span className="tag">Done ✓</span> : <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => { setDone({ ...done, [k]: true }); setPoints(points + p); setLife(life + p); toast(`+${p} points. Nice work.`); }}>Mark done</button>}
          </div>
        ))}
      </div>
      <p className="mock">TODO(IT): verify points server side (watch data, shift system, CEU provider) before rewards have cash value.</p>
    </>
  );
}

function KnowsYou() {
  const { toast } = usePhone();
  type Pref = { i: string; k: string; v: string; src: string; conf: number; ok: boolean };
  const [prefs, setPrefs] = useState<Pref[]>(PREFS0.map((p) => ({ i: p[0], k: p[1], v: p[2], src: p[3], conf: p[4], ok: false })));
  const [src, setSrc] = useState<Record<string, boolean>>({ "What you do in HOP": true, "Your calendars": true, "Your watch": true, "Your work schedule": true, "Saved with HOP": false });
  const [teach, setTeach] = useState("");
  return (
    <>
      <div className="hello disp">HOP knows you</div>
      <div className="sub">What HOP has learned, so you never explain yourself twice. Fix or forget anything.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {prefs.map((p, i) => (
          <div className="it" key={p.k + i} style={{ alignItems: "flex-start" }}>
            <div className="ico t">{p.i}</div>
            <div className="grow">
              <small className="kick">{p.k}</small><b style={{ fontSize: 13.5 }}>{p.v}</b>
              <small>{p.src}{p.ok ? " · confirmed" : ` · ${p.conf}% sure`}</small>
              {!p.ok && (
                <div className="row" style={{ gap: 6, marginTop: 6 }}>
                  <button className="chip" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setPrefs(prefs.map((x, j) => (j === i ? { ...x, ok: true, conf: 100 } : x))); toast("Got it. HOP will remember."); }}>✓ That is right</button>
                  <button className="chip" style={{ padding: "5px 10px", fontSize: 12 }} onClick={() => { setPrefs(prefs.filter((_, j) => j !== i)); toast("Forgotten."); }}>Forget this</button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="card">
        <h3>Teach HOP something</h3>
        <textarea className="field" rows={2} style={{ marginTop: 10 }} value={teach} onChange={(e) => setTeach(e.target.value)} placeholder="For example: Leo is allergic to tree nuts" />
        <button className="btn n w" style={{ marginTop: 10 }} onClick={() => { if (!teach.trim()) return; setPrefs([{ i: "📝", k: "You told HOP", v: teach.trim(), src: "Just now", conf: 100, ok: true }, ...prefs]); setTeach(""); toast("Saved to your HOP profile."); }}>Save to my profile</button>
      </div>
      <div className="sect"><h2>What HOP learns from</h2></div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {SOURCES.map((k) => <div className="it" key={k}><div className="grow"><b style={{ fontSize: 13.5 }}>{k}</b></div><button className={`toggle ${src[k] ? "on" : ""}`} aria-label={k} onClick={() => setSrc({ ...src, [k]: !src[k] })} /></div>)}
      </div>
      <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
        <h3>Our promise</h3>
        <p>HOP only learns from what you turn on or tell us. We never follow you around other websites or apps, and we never sell your data. Your hospital only sees unit totals.</p>
      </div>
    </>
  );
}

function SmartHome() {
  const { toast } = usePhone();
  const [on, setOn] = useState<Record<string, boolean>>({});
  const [mode, setMode] = useState("ask");
  return (
    <>
      <div className="hello disp">Smart home and voice</div>
      <div className="sub">Ask HOP out loud, track it on your watch, and let a verified rep in when you are not home.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {DEVICES.map(([k, i, n, d]) => (
          <div className="it" key={k}>
            <div className="ico t">{i}</div>
            <div className="grow"><b>{n}</b><small>{on[k] ? "Connected · ready" : d}</small></div>
            {/* TODO(IT): Alexa Skill account linking, Siri App Intents, Google App Actions, Seam Connect Webview for locks */}
            <button className={`btn ${on[k] ? "o" : "p"}`} style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => { setOn({ ...on, [k]: !on[k] }); toast(n + (on[k] ? " disconnected." : " connected.")); }}>{on[k] ? "Disconnect" : "Connect"}</button>
          </div>
        ))}
      </div>
      <div className="sect"><h2>Home access for HOP reps</h2></div>
      <div className="card">
        {[["ask", "Ask me each time", "You approve every unlock"], ["window", "Allow during my delivery window", "Only for that job and time"], ["never", "Never unlock", "Rep leaves it at the door"]].map(([k, l, s]) => (
          <button key={k} className={`chk ${mode === k ? "on" : ""}`} style={{ textDecoration: "none", color: "var(--ink)", alignItems: "flex-start" }} onClick={() => { setMode(k); toast("Home access setting saved."); }}>
            <span style={{ borderRadius: "50%" }}>{mode === k ? "✓" : ""}</span>
            <div><b style={{ fontSize: 13.5, display: "block" }}>{l}</b><small style={{ fontSize: 12, color: "var(--muted)" }}>{s}</small></div>
          </button>
        ))}
        <p className="mock" style={{ textAlign: "left" }}>Every unlock relocks on its own, and you get a photo when the job is done. [CONFIRM smart lock partners]</p>
      </div>
    </>
  );
}
