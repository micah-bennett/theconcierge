"use client";
import { useEffect, useRef, useState } from "react";
import { messagesApi } from "@hop/shared/client";
import { MessageThread } from "@hop/shared/ui/MessageThread";
import { usePhone } from "@hop/shared/ui/Phone";
import type { JobCat } from "@hop/shared/types";
import { CATS, type Cat } from "@/lib/roles";
import { Svg, ic } from "./bits";
import { useConnections, useStaff } from "./store";

const head = { color: "var(--navy)", fontSize: 20 } as const;
const kick = { fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "12px 2px 8px", letterSpacing: ".06em", textTransform: "uppercase" } as const;

// ── Ask HOP (mockup compose) ─────────────────────────────────────────────────

export function ComposeSheet({ cat: cat0, seed = "" }: { cat: Cat; seed?: string }) {
  const { ask, go, pickedWindow, setPickedWindow } = useStaff();
  const { closeSheet } = usePhone();
  const [cat, setCat] = useState<Cat>(cat0);
  const [text, setText] = useState(seed);
  const whens = ["As soon as possible", pickedWindow ?? "My next open window", "After my shift"];
  const [when, setWhen] = useState(1);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus({ preventScroll: true }), 300);
    return () => clearTimeout(t);
  }, []);
  const C = CATS[cat];

  async function send() {
    const t = text.trim() || C[2].split(",")[0];
    setBusy(true);
    const ok = await ask({ cat, text: t.charAt(0).toUpperCase() + t.slice(1), window: whens[when], source: "ask" });
    setBusy(false);
    if (!ok) return;
    if (when === 1 && pickedWindow) setPickedWindow(null);
    closeSheet();
    go("home");
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="ico t">{C[0]}</div>
        <div>
          <h2 className="disp" style={{ ...head, fontSize: 19 }}>{C[1]}</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>{C[2]}</p>
        </div>
      </div>
      <div className="cats" style={{ marginBottom: 12, gridTemplateColumns: "repeat(3,1fr)" }}>
        {(Object.keys(CATS) as Cat[]).map((k) => (
          <button key={k} className="cat" style={k === cat ? { background: "var(--soft-teal)", borderColor: "var(--teal)" } : undefined} onClick={() => setCat(k)}>
            <span>{CATS[k][0]}</span>
            {CATS[k][1]}
          </button>
        ))}
      </div>
      <textarea ref={ref} className="field" rows={3} maxLength={400} placeholder="Tell HOP what you need" value={text} onChange={(e) => setText(e.target.value)} />
      <p style={kick}>When</p>
      <div className="moods" style={{ margin: "0 0 14px" }}>
        {whens.map((w, i) => (
          <button key={i} className={`chip ${when === i ? "on" : ""}`} onClick={() => setWhen(i)}>
            {w}
          </button>
        ))}
      </div>
      <button className="btn p w" disabled={busy} onClick={send}>
        {busy ? "Sending…" : "Send to HOP"}
      </button>
      <p className="mock">HOP matches the best option, tracks it, and confirms when it is done.</p>
    </div>
  );
}

// ── Clutch ───────────────────────────────────────────────────────────────────

const CLUTCH: [string, string][] = [["🏃", "Late for a pickup"], ["🎂", "Forgot a big date"], ["🔑", "Locked out"], ["🚗", "Car trouble"], ["🤒", "Sick kid at school"], ["🍽️", "Need food right now"]];

export function ClutchSheet() {
  const { ask, go } = useStaff();
  const { closeSheet } = usePhone();
  const [busy, setBusy] = useState(false);
  async function send(x: string) {
    if (busy) return;
    setBusy(true);
    const cat: JobCat = x === "Need food right now" ? "food" : x === "Sick kid at school" || x === "Late for a pickup" ? "family" : x === "Car trouble" ? "ride" : "errand";
    const ok = await ask({ cat, text: `Clutch: ${x}`, urgent: true, source: "clutch" }, "Clutch is on. Your concierge is calling you in 2 minutes.");
    setBusy(false);
    if (ok) {
      closeSheet();
      go("home");
    }
  }
  return (
    <div>
      <div style={{ textAlign: "center" }}>
        <div className="cz" style={{ margin: "0 auto 10px", width: 58, height: 58, fontSize: 28 }}>⚡</div>
        <h2 className="disp" style={{ ...head, fontSize: 21 }}>Clutch</h2>
        <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 14px" }}>What is on fire? Pick one or just tap call.</p>
      </div>
      <div className="grid2">
        {CLUTCH.map(([i, x]) => (
          <button key={x} className="tile" style={{ textAlign: "center" }} disabled={busy} onClick={() => send(x)}>
            <div style={{ fontSize: 24, marginBottom: 6 }}>{i}</div>
            <b style={{ fontSize: 13 }}>{x}</b>
          </button>
        ))}
      </div>
      <button className="btn c w" disabled={busy} onClick={() => send("Call me now")}>
        Call me now
      </button>
      <p className="mock">Clutch requests jump the line. A real person picks up. [CONFIRM hours for Clutch coverage]</p>
    </div>
  );
}

// ── Overtime Rescue ──────────────────────────────────────────────────────────

const RESCUE: [string, string, string][] = [
  ["🧒", "School pickup", "HOP confirms the details with you first"],
  ["🐕", "Walk and feed the dog", "So they aren't waiting on you"],
  ["🍲", "Dinner for the family", "Delivered home this evening"],
  ["💬", "Text home for me", "We let them know you are safe and running late"]
];

export function RescueSheet() {
  const { ask, go } = useStaff();
  const { closeSheet, toast } = usePhone();
  const [on, setOn] = useState<boolean[]>(RESCUE.map(() => true));
  const [busy, setBusy] = useState(false);
  async function send() {
    const items = RESCUE.filter((_, i) => on[i]).map((x) => x[1]);
    if (!items.length) return toast("Pick at least one thing to cover.");
    setBusy(true);
    const ok = await ask({ cat: "family", text: `Overtime Rescue: ${items.join(", ")}`, window: "Tonight", source: "rescue" }, "Tonight is covered. Focus on your patients.");
    setBusy(false);
    if (ok) {
      closeSheet();
      go("home");
    }
  }
  return (
    <div>
      <h2 className="disp" style={head}>Overtime Rescue</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, marginBottom: 12 }}>You are staying late. What should HOP cover tonight?</p>
      {RESCUE.map((x, i) => (
        <div className="card" key={x[1]}>
          <div className="row between">
            <div className="row">
              <div className="ico t">{x[0]}</div>
              <div>
                <h3>{x[1]}</h3>
                <p>{x[2]}</p>
              </div>
            </div>
            <button className={`toggle ${on[i] ? "on" : ""}`} aria-label={x[1]} aria-pressed={on[i]} onClick={() => setOn(on.map((v, j) => (j === i ? !v : v)))} />
          </div>
        </div>
      ))}
      <button className="btn c w" disabled={busy} onClick={send}>
        {busy ? "Sending…" : "Cover tonight"}
      </button>
      <p className="mock">Your unit leader never sees what you request. [CONFIRM details for organization funded plans]</p>
    </div>
  );
}

// ── Voice errand drop ────────────────────────────────────────────────────────

type Item = [icon: string, title: string, detail: string, cls: string];

/** Splits a spoken list into errands: "dog food, a card for mom, and grab my dry cleaning". */
export function splitErrands(t: string): string[] {
  return t
    .replace(/\b(i need|i want|i'd like|can (someone|you|hop)|could (someone|you|hop)|please|also|then)\b/gi, ",")
    .split(/,|;|\.|\n|\band\b|\bplus\b/i)
    .map((s) => s.trim().replace(/^to\s+/i, ""))
    .filter((s) => s.length > 2)
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .slice(0, 10);
}

type Rec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
};

/**
 * Uses the browser's speech recognition (webkitSpeechRecognition) when it exists and the member
 * allows the mic. Otherwise (or when they'd rather type) a text box goes through the same
 * splitErrands → one real request flow. Nothing is scripted.
 */
export function VoiceSheet() {
  const { ask, go } = useStaff();
  const { closeSheet } = usePhone();
  const [mode, setMode] = useState<"live" | "type" | null>(null);
  const [listening, setListening] = useState(false);
  const [text, setText] = useState("");
  const [typed, setTyped] = useState("");
  const [why, setWhy] = useState<string | null>(null);
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const rec = useRef<Rec | null>(null);
  const finalText = useRef("");

  const finish = (t: string) => {
    setListening(false);
    setItems(splitErrands(t).map((p) => ["📝", p, "HOP sorts out the details", "t"]));
  };

  const typeInstead = (reason: string | null) => {
    rec.current = null;
    setMode("type");
    setListening(false);
    setWhy(reason);
    setItems(null);
  };

  const live = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return typeInstead("Voice isn't available in this browser.");
    const r = new Ctor();
    r.lang = "en-US";
    r.interimResults = true;
    r.continuous = false;
    finalText.current = "";
    let failed = false;
    r.onresult = (e) => {
      if (rec.current !== r) return;
      let interim = "";
      let fin = "";
      for (let k = 0; k < e.results.length; k++) {
        const res = e.results[k];
        if (res.isFinal) fin += res[0].transcript;
        else interim += res[0].transcript;
      }
      finalText.current = fin;
      setText(fin + interim);
    };
    r.onerror = (e) => {
      if (rec.current !== r) return;
      failed = true;
      if (e.error === "aborted") return;
      typeInstead(e.error === "not-allowed" || e.error === "service-not-allowed" ? "The mic is blocked for this site." : e.error === "no-speech" ? "HOP didn't hear anything." : "Voice didn't work this time.");
    };
    r.onend = () => {
      if (failed || rec.current !== r) return;
      const t = finalText.current.trim();
      if (t) finish(t);
      else {
        setListening(false);
        setText("");
      }
    };
    rec.current = r;
    setMode("live");
    setListening(true);
    setItems(null);
    setText("");
    try {
      r.start();
    } catch {
      typeInstead("Voice didn't start in this browser.");
    }
  };

  useEffect(() => {
    live();
    return () => {
      const r = rec.current;
      rec.current = null;
      r?.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function send() {
    if (!items?.length) return;
    setBusy(true);
    const ok = await ask({ cat: "errand", text: `Voice drop: ${items.map((x) => x[1]).join("; ")}`.slice(0, 400), source: "voice" }, "Sent. Your concierge is on it.");
    setBusy(false);
    if (ok) {
      closeSheet();
      go("home");
    }
  }

  return (
    <div>
      <h2 className="disp" style={{ ...head, textAlign: "center" }}>Voice errand drop</h2>
      <p style={{ textAlign: "center", color: "var(--muted)", fontSize: 14 }}>Just say it. HOP sorts it out.</p>
      {mode !== "type" ? (
        <>
          <button className={`mic ${listening ? "live" : ""}`} aria-label={listening ? "Stop listening" : "Start listening"} onClick={() => (listening ? rec.current?.stop() : live())} style={{ display: "grid" }}>
            <Svg p={ic.mic} />
          </button>
          <div className="transcript">{text ? text : <span style={{ color: "#9aa5b8" }}>{listening ? "Listening..." : "Tap the mic and say your errands."}</span>}</div>
          <p style={{ textAlign: "center", marginBottom: 8 }}>
            <a role="button" style={{ fontSize: 13, color: "var(--teal)", fontWeight: 700, cursor: "pointer" }} onClick={() => { rec.current?.abort(); typeInstead(null); }}>
              Type it instead
            </a>
          </p>
        </>
      ) : (
        <div style={{ margin: "12px 0" }}>
          {why && <p className="mock" style={{ marginTop: 0, marginBottom: 8 }}>{why} Type what you need instead.</p>}
          <textarea
            className="field"
            rows={3}
            maxLength={400}
            placeholder="Type what you need, for example: dog food, a card for mom, and my dry cleaning"
            aria-label="Type what you need"
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
          />
          <div className="row" style={{ gap: 8, marginTop: 8 }}>
            <button className="btn n" style={{ flex: 1 }} disabled={!typed.trim()} onClick={() => finish(typed)}>
              Make my list
            </button>
            <button className="btn o" style={{ flex: "0 0 auto" }} onClick={live} aria-label="Try the mic again">
              <Svg p={ic.mic} size={18} />
            </button>
          </div>
        </div>
      )}
      <div className="parsed">
        {items && items.length > 0 && (
          <>
            <p style={{ ...kick, margin: "4px 2px 8px" }}>
              HOP heard {items.length} errand{items.length === 1 ? "" : "s"}
            </p>
            {items.map((x, k) => (
              <div className="card" key={k} style={{ animationDelay: `${k * 0.12}s` }}>
                <div className="row">
                  <div className={`ico ${x[3]}`}>{x[0]}</div>
                  <div>
                    <h3>{x[1]}</h3>
                    <p>{x[2]}</p>
                  </div>
                </div>
              </div>
            ))}
            <button className="btn p w" disabled={busy} onClick={send}>
              {busy ? "Sending…" : "Send to my concierge"}
            </button>
          </>
        )}
        {items && !items.length && <p className="mock">HOP didn&apos;t catch any errands. Try again with a short list.</p>}
      </div>
    </div>
  );
}

// ── Message HOP Concierge (a real thread with the HOP team) ─────────────────

/** Chips that create a real request right away. */
const CHAT_REQUESTS: Record<string, { cat: JobCat; text: string }> = {
  "Book a ride home": { cat: "ride", text: "Ride home from the staff exit when my shift ends" },
  "Plan my evening": { cat: "food", text: "Plan my evening: dinner and a dog walk" },
  "Surprise my family": { cat: "family", text: "Surprise my family: a pizza night with a note from me" }
};
/** Chips that send a message to the team. */
const CHAT_MESSAGES = ["I am feeling overwhelmed", "Can you call me?", "Where is my request?"];

export function ChatSheet() {
  const { ask, profile } = useStaff();
  const { toast } = usePhone();
  const [busy, setBusy] = useState(false);
  // Remounting the thread after a chip message shows it straight away instead of on the next poll.
  const [rev, setRev] = useState(0);

  async function chipRequest(label: string) {
    setBusy(true);
    await ask({ ...CHAT_REQUESTS[label], source: "chat" }, "Sent to your concierge. Track it in Your requests.");
    setBusy(false);
  }

  async function chipMessage(body: string) {
    if (!profile) return;
    setBusy(true);
    try {
      await messagesApi.post("staff", profile.id, body);
      setRev((n) => n + 1);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't send. Try again.");
    }
    setBusy(false);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 8 }}>
        <div className="ico t">
          <Svg p={ic.chat} size={22} style={{ color: "var(--teal)" }} />
        </div>
        <div>
          <h2 className="disp" style={{ ...head, fontSize: 19 }}>Message HOP Concierge</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>A real person on the HOP team replies, usually within a few minutes during service hours. [CONFIRM hours]</p>
        </div>
      </div>
      {profile ? (
        <MessageThread
          key={rev}
          kind="staff"
          threadKey={profile.id}
          meId={profile.id}
          emptyText="Say hello, ask a question, or tell us what you need."
          placeholder="Message the HOP team"
          onError={toast}
        />
      ) : (
        <p className="mock">Loading…</p>
      )}
      <p style={{ ...kick, margin: "12px 2px 6px" }}>Quick asks</p>
      <div className="moods" style={{ margin: "0 0 6px" }}>
        {Object.keys(CHAT_REQUESTS).map((p) => (
          <button key={p} className="chip" disabled={busy} onClick={() => chipRequest(p)}>
            {p}
          </button>
        ))}
        {CHAT_MESSAGES.map((p) => (
          <button key={p} className="chip" disabled={busy || !profile} onClick={() => chipMessage(p)}>
            {p}
          </button>
        ))}
      </div>
      <p className="mock">Ride, evening and family chips go straight to your concierge as requests. The others send a message.</p>
    </div>
  );
}

/** Job chat: the member and the rep on one request (the Console can read it). */
export function JobChatSheet({ jobId, title, rep }: { jobId: string; title: string; rep: string | null }) {
  const { profile } = useStaff();
  const { toast } = usePhone();
  return (
    <div>
      <h2 className="disp" style={{ ...head, fontSize: 19 }}>Message {rep || "your rep"}</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{title}</p>
      {profile ? <MessageThread kind="job" threadKey={jobId} meId={profile.id} emptyText={`No messages yet. ${rep || "Your rep"} sees what you write here.`} onError={toast} /> : <p className="mock">Loading…</p>}
      <p className="mock">The HOP team can read this conversation too.</p>
    </div>
  );
}

// ── Connect apps + permissions (consent intent only) ─────────────────────────

const WEAR: [string, string][] = [["Apple Health", "iPhone and Apple Watch"], ["Health Connect", "Android, Samsung, Pixel Watch"], ["Fitbit", "Fitbit devices"], ["Garmin", "Garmin watches"], ["Oura", "Oura Ring"], ["WHOOP", "WHOOP band"]];
const CALS: [string, string][] = [["Google Calendar", "Personal or work"], ["Outlook", "Microsoft 365 or Outlook.com"], ["Apple Calendar", "iCloud"]];
const WORK = "Unit schedule app";

type Kind = "wear" | "cal" | "work";

export function ConnectSheet() {
  const { setConsent, go } = useStaff();
  const { openSheet, closeSheet, toast } = usePhone();
  const conn = useConnections();
  const isOn = (k: Kind, n: string) => (k === "wear" ? conn.wear === n : k === "cal" ? conn.cal.includes(n) : conn.work);
  const row = (n: string, d: string, k: Kind) => {
    const on = isOn(k, n);
    return (
      <div className="it" key={n}>
        <div className="grow">
          <b>{n}</b>
          <small>{on ? "Saved · we'll connect this when it's ready" : d}</small>
        </div>
        <button
          className={`btn ${on ? "o" : "p"}`}
          style={{ padding: "7px 12px", fontSize: 12 }}
          onClick={async () => {
            if (on) {
              if (await setConsent(`${k}:${n}`, false)) toast(`${n} turned off.`);
            } else openSheet(<PermSheet k={k} n={n} />);
          }}
        >
          {on ? "Turn off" : "Turn on"}
        </button>
      </div>
    );
  };
  return (
    <div>
      <h2 className="disp" style={head}>Connect your apps</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 12px" }}>
        We&apos;ll connect these when they&apos;re ready. For now HOP saves your choice and reads nothing. When it does, it reads only what you allow and never shares who you are with your organization.
      </p>
      <p className="kick" style={{ margin: "4px 2px 6px" }}>Watch or health app · pick one</p>
      <div className="card list" style={{ padding: "4px 16px" }}>{WEAR.map((w) => row(w[0], w[1], "wear"))}</div>
      <p className="kick" style={{ margin: "4px 2px 6px" }}>Calendars</p>
      <div className="card list" style={{ padding: "4px 16px" }}>{CALS.map((c) => row(c[0], c[1], "cal"))}</div>
      <p className="kick" style={{ margin: "4px 2px 6px" }}>Work schedule</p>
      <div className="card list" style={{ padding: "4px 16px" }}>{row(WORK, "Shifts, overtime, and swaps [CONFIRM which apps]", "work")}</div>
      <p className="kick" style={{ margin: "4px 2px 6px" }}>Voice and smart home</p>
      <div className="card list" style={{ padding: "4px 16px" }}>
        <div className="it">
          <div className="grow">
            <b>Alexa, Apple, Android, and smart locks</b>
            <small>Coming soon</small>
          </div>
          <button
            className="btn p"
            style={{ padding: "7px 12px", fontSize: 12 }}
            onClick={() => {
              closeSheet();
              go("smart");
            }}
          >
            See more
          </button>
        </div>
      </div>
      <button className="btn n w" onClick={closeSheet}>
        Done
      </button>
    </div>
  );
}

export function PermSheet({ k, n }: { k: Kind; n: string }) {
  const { setConsent, patch, profile } = useStaff();
  const { openSheet, toast } = usePhone();
  const P: [string, string][] =
    k === "wear"
      ? [["Sleep", "Spot rough nights and protect your rest"], ["Heart rate and HRV", "Notice stress and recovery"], ["Steps and activity", "Power challenges and rewards"], ["Stress score", "Offer a reset before it builds up"]]
      : k === "cal"
        ? [["Event times", "Find open windows for deliveries"], ["Event titles", "Plan around pickups and big days (optional)"]]
        : [["Shifts", "Only offer help when you are off"], ["Overtime and swaps", "Trigger Overtime Rescue and Swap and Save"]];
  const [on, setOn] = useState<boolean[]>(P.map((_, i) => !(k === "cal" && i === 1)));
  const [busy, setBusy] = useState(false);

  async function allow() {
    setBusy(true);
    const ok = await setConsent(`${k}:${n}`, true, P.filter((_, i) => on[i]).map((p) => p[0]));
    setBusy(false);
    if (!ok) return;
    toast(`Saved. We'll connect ${n} when it's ready.`);
    if (k === "wear" && !profile?.claimed.includes("connect")) {
      const r = await patch({ claim: "connect" });
      if (r?.added) toast(`Saved. +${r.added} points.`);
    }
    openSheet(<ConnectSheet />);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="ico t">{k === "wear" ? "⌚" : k === "cal" ? "📅" : "🗓️"}</div>
        <div>
          <h2 className="disp" style={{ ...head, fontSize: 19 }}>{n}</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Choose what HOP may read once it&apos;s connected</p>
        </div>
      </div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {P.map((p, i) => (
          <div className="it" key={p[0]}>
            <div className="grow">
              <b style={{ fontSize: 13.5 }}>{p[0]}</b>
              <small>{p[1]}</small>
            </div>
            <button className={`toggle ${on[i] ? "on" : ""}`} aria-label={p[0]} aria-pressed={on[i]} onClick={() => setOn(on.map((v, j) => (j === i ? !v : v)))} />
          </div>
        ))}
      </div>
      <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
        <h3>What your organization sees</h3>
        <p>Only totals for whole units, like &quot;ICU sleep is down this week.&quot; Never your name, your data, or your requests.</p>
      </div>
      <button className="btn p w" disabled={busy} onClick={allow}>
        {busy ? "Saving…" : "Save my choice"}
      </button>
      <button className="btn o w" style={{ marginTop: 8 }} onClick={() => openSheet(<ConnectSheet />)}>
        Back
      </button>
      {/* TODO(IT): real OAuth / HealthKit / Health Connect flows after the privacy and HIPAA review. Today this only records consent intent. */}
      <p className="mock">
        We&apos;ll connect this when it&apos;s ready. Nothing is read from {n} until then, and not before our privacy review. Turn it off anytime. [CONFIRM final data list with privacy review]
      </p>
    </div>
  );
}
