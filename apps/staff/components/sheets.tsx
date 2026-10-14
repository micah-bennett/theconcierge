"use client";
import { useEffect, useRef, useState } from "react";
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
  ["🧒", "School pickup", "Approved pickup person on file"],
  ["🐕", "Walk and feed the dog", "Your regular pet sitter"],
  ["🍲", "Dinner for the family", "Delivered at 6:30 PM"],
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
      <p className="mock">Your unit leader never sees what you request. [CONFIRM details for hospital funded plans]</p>
    </div>
  );
}

// ── Voice errand drop ────────────────────────────────────────────────────────

type Item = [icon: string, title: string, detail: string, cls: string];

const DEMO_LINE = "I need dog food, a birthday card for my mom, and can someone grab my dry cleaning before Friday.";
const DEMO_ITEMS: Item[] = [
  ["🐶", "Dog food", "Your usual brand · delivered in your next open window", "t"],
  ["🎂", "Birthday card for Mom", "3 picks sent for you to choose · mailed by Wed", "g"],
  ["👔", "Dry cleaning pickup", "Back on your door before Friday 6 PM", "s"]
];

/** Splits a spoken list into errands: "dog food, a card for mom, and grab my dry cleaning". */
export function splitErrands(t: string): string[] {
  return t
    .replace(/\b(i need|i want|i'd like|can (someone|you|hop)|could (someone|you|hop)|please|also|then)\b/gi, ",")
    .split(/,|;|\.|\band\b|\bplus\b/i)
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
 * allows the mic; otherwise plays the mockup's scripted demo. The errands go as one real request.
 */
export function VoiceSheet() {
  const { ask, go } = useStaff();
  const { closeSheet } = usePhone();
  const [mode, setMode] = useState<"live" | "demo" | null>(null);
  const [listening, setListening] = useState(true);
  const [text, setText] = useState("");
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const rec = useRef<Rec | null>(null);
  const finalText = useRef("");
  const timer = useRef<ReturnType<typeof setInterval>>(undefined);

  const finish = (t: string) => {
    setListening(false);
    const parts = splitErrands(t);
    setItems(parts.map((p) => ["📝", p, "HOP sorts out the details", "t"]));
  };

  const demo = () => {
    setMode("demo");
    setListening(true);
    setItems(null);
    let i = 0;
    clearInterval(timer.current);
    timer.current = setInterval(() => {
      i += 2;
      setText(DEMO_LINE.slice(0, i));
      if (i >= DEMO_LINE.length) {
        clearInterval(timer.current);
        setListening(false);
        setItems(DEMO_ITEMS);
      }
    }, 35);
  };

  const live = () => {
    const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Ctor) return demo();
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
      // No mic permission, no speech service, etc.: fall back to the scripted demo.
      if (e.error !== "aborted") demo();
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
      demo();
    }
  };

  useEffect(() => {
    live();
    return () => {
      clearInterval(timer.current);
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
      <button
        className={`mic ${listening ? "live" : ""}`}
        aria-label={listening ? "Stop listening" : "Start listening"}
        onClick={() => (listening ? (mode === "live" ? rec.current?.stop() : undefined) : live())}
        style={{ display: "grid" }}
      >
        <Svg p={ic.mic} />
      </button>
      <div className="transcript">{text ? text : <span style={{ color: "#9aa5b8" }}>{listening ? "Listening..." : "Tap the mic and say your errands."}</span>}</div>
      {mode === "demo" && <p className="mock" style={{ marginTop: -4 }}>Voice isn&apos;t available in this browser, so this is a sample. Sending it creates a real request.</p>}
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
        {items && !items.length && <p className="mock">HOP didn&apos;t catch any errands. Tap the mic to try again.</p>}
      </div>
    </div>
  );
}

// ── Chat with Hop (scripted; asks become real requests) ──────────────────────

const CHAT: Record<string, { reply: string; req: { cat: JobCat; text: string } | null }> = {
  "Plan my evening": {
    reply: "Done. I asked your concierge for dinner at 7:45 and a dog walk at 6, and I blocked 9:30 as wind down time. Track it in Your requests.",
    req: { cat: "food", text: "Plan my evening: dinner at 7:45 PM and a dog walk at 6 PM" }
  },
  "Book a ride home": {
    reply: "A vetted driver will be at the staff exit when your shift ends. Your concierge has the request, and I will send the car details 10 minutes before.",
    req: { cat: "ride", text: "Ride home from the staff exit when my shift ends" }
  },
  "I am feeling overwhelmed": {
    reply: "Thank you for telling me. I can hold the quiet room for ten minutes right now, and take two errands off tonight. If you want to talk to someone, I can connect you with your support line. [CONFIRM resource]",
    req: null
  },
  "Surprise my family": {
    reply: "Love it. I asked your concierge for a pizza night delivered at 6 with a note from you. Track it in Your requests.",
    req: { cat: "family", text: "Surprise my family: pizza night delivered at 6 PM with a note from me" }
  }
};

function guessCat(t: string): JobCat {
  const s = t.toLowerCase();
  if (/\b(ride|drive|uber|lyft|airport|commute|car)\b/.test(s)) return "ride";
  if (/\b(dog|cat|pet|walk|vet|litter)\b/.test(s)) return "pet";
  if (/\b(food|lunch|dinner|breakfast|coffee|latte|meal|eat|snack|pizza)\b/.test(s)) return "food";
  if (/\b(kid|kids|son|daughter|school|family|mom|dad|sitter|childcare|pickup)\b/.test(s)) return "family";
  if (/\b(package|grocer|groceries|deliver|delivery|drop off)\b/.test(s)) return "delivery";
  return "errand";
}

export function ChatSheet() {
  const { thread, setThread, ask } = useStaff();
  const [msg, setMsg] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [thread]);

  const reply = (t: string) => setTimeout(() => setThread((th) => [...th, ["ai", t]]), 700);

  async function chip(p: string) {
    setThread((th) => [...th, ["me", p]]);
    const c = CHAT[p];
    if (c.req) {
      const ok = await ask({ ...c.req, source: "chat" }, "Sent to your concierge.");
      reply(ok ? c.reply : "I couldn't reach your concierge just now. Try again in a moment.");
    } else reply(c.reply);
  }

  async function typed() {
    const t = msg.trim();
    if (!t) return;
    setMsg("");
    setThread((th) => [...th, ["me", t]]);
    const ok = await ask({ cat: guessCat(t), text: t.slice(0, 400), source: "chat" }, "Sent to your concierge.");
    reply(ok ? "Got it. I sent that to your concierge, and you can watch it in Your requests." : "I couldn't reach your concierge just now. Try again in a moment.");
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="ico t">
          <Svg p={ic.chat} size={22} style={{ color: "var(--teal)" }} />
        </div>
        <div>
          <h2 className="disp" style={{ ...head, fontSize: 19 }}>Hop</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Your always on concierge</p>
        </div>
      </div>
      <div className="chat" ref={box}>
        {thread.map((m, i) => (
          <div key={i} className={`bub ${m[0]}`}>
            {m[1]}
          </div>
        ))}
      </div>
      <div className="moods" style={{ margin: "0 0 10px" }}>
        {Object.keys(CHAT).map((p) => (
          <button key={p} className="chip" onClick={() => chip(p)}>
            {p}
          </button>
        ))}
      </div>
      <form
        className="row"
        style={{ gap: 8 }}
        onSubmit={(e) => {
          e.preventDefault();
          typed();
        }}
      >
        <input className="field" value={msg} maxLength={400} onChange={(e) => setMsg(e.target.value)} placeholder="Ask Hop for anything" />
        <button className="btn p" style={{ padding: "11px 14px" }}>
          Send
        </button>
      </form>
      {/* No LLM in this phase. TODO(IT): a real assistant behind the same request flow. */}
      <p className="mock">Sample conversation. Anything you ask for goes to your concierge as a real request.</p>
    </div>
  );
}

// ── Connect apps + permissions (consent intent only) ─────────────────────────

const WEAR: [string, string][] = [["Apple Health", "iPhone and Apple Watch"], ["Health Connect", "Android, Samsung, Pixel Watch"], ["Fitbit", "Fitbit devices"], ["Garmin", "Garmin watches"], ["Oura", "Oura Ring"], ["WHOOP", "WHOOP band"]];
const CALS: [string, string][] = [["Google Calendar", "Personal or work"], ["Outlook", "Microsoft 365 or Outlook.com"], ["Apple Calendar", "iCloud"]];
const WORK = "Unit schedule app";

type Kind = "wear" | "cal" | "work";

export function ConnectSheet() {
  const { setConsent, homeConn, go } = useStaff();
  const { openSheet, closeSheet, toast } = usePhone();
  const conn = useConnections();
  const isOn = (k: Kind, n: string) => (k === "wear" ? conn.wear === n : k === "cal" ? conn.cal.includes(n) : conn.work);
  const row = (n: string, d: string, k: Kind) => {
    const on = isOn(k, n);
    return (
      <div className="it" key={n}>
        <div className="grow">
          <b>{n}</b>
          <small>{on ? "Connected · consent saved" : d}</small>
        </div>
        <button
          className={`btn ${on ? "o" : "p"}`}
          style={{ padding: "7px 12px", fontSize: 12 }}
          onClick={async () => {
            if (on) {
              if (await setConsent(`${k}:${n}`, false)) toast(`${n} disconnected. HOP stopped reading it.`);
            } else openSheet(<PermSheet k={k} n={n} />);
          }}
        >
          {on ? "Disconnect" : "Connect"}
        </button>
      </div>
    );
  };
  return (
    <div>
      <h2 className="disp" style={head}>Connect your apps</h2>
      <p style={{ color: "var(--muted)", fontSize: 14, margin: "4px 0 12px" }}>HOP reads only what you allow and never shares who you are with your hospital.</p>
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
            <small>{Object.values(homeConn).filter(Boolean).length} connected</small>
          </div>
          <button
            className="btn p"
            style={{ padding: "7px 12px", fontSize: 12 }}
            onClick={() => {
              closeSheet();
              go("smart");
            }}
          >
            Set up
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
    toast(`${n} connected. HOP saved your choice.`);
    if (k === "wear" && !profile?.claimed.includes("connect")) {
      const r = await patch({ claim: "connect" });
      if (r?.added) toast(`${n} connected. +${r.added} points.`);
    }
    openSheet(<ConnectSheet />);
  }

  return (
    <div>
      <div className="row" style={{ marginBottom: 10 }}>
        <div className="ico t">{k === "wear" ? "⌚" : k === "cal" ? "📅" : "🗓️"}</div>
        <div>
          <h2 className="disp" style={{ ...head, fontSize: 19 }}>Connect {n}</h2>
          <p style={{ fontSize: 13, color: "var(--muted)" }}>Choose what HOP can read</p>
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
        <h3>What your hospital sees</h3>
        <p>Only totals for whole units, like &quot;ICU sleep is down this week.&quot; Never your name, your data, or your requests.</p>
      </div>
      <button className="btn p w" disabled={busy} onClick={allow}>
        {busy ? "Connecting..." : "Allow and connect"}
      </button>
      <button className="btn o w" style={{ marginTop: 8 }} onClick={() => openSheet(<ConnectSheet />)}>
        Back
      </button>
      {/* TODO(IT): real OAuth / HealthKit / Health Connect flows after the privacy and HIPAA review. Today this only records consent intent. */}
      <p className="mock">
        HOP saves your choice now. Nothing is read from {n} until our privacy review is done. Turn it off anytime. [CONFIRM final data list with privacy review]
      </p>
    </div>
  );
}
