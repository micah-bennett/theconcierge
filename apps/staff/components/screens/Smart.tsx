"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { useStaff } from "../store";

const HOMEDEV: [string, string, string, string][] = [
  ["alexa", "🔵", "Amazon Alexa", "Voice requests, Echo Show tracking, and smart locks"],
  ["apple", "🍎", "Apple", "Siri, Apple Watch, Live Activities, and Apple Home"],
  ["google", "🟢", "Google and Android", "Google Assistant, home screen widgets, and Google Home"],
  ["lock", "🔐", "Smart lock or doorbell", "August, Yale, Schlage, or Ring through Alexa or Google Home"]
];

/** Mockup `smart`: all sample. TODO(IT): Alexa Skill linking, Siri App Intents, Google App Actions, Seam Connect for locks. */
export function Smart() {
  const { homeConn, setHomeConn, go } = useStaff();
  const { toast } = usePhone();
  const [pending, setPending] = useState<string | null>(null);
  const [entry, setEntry] = useState("ask");
  const any = Object.values(homeConn).some(Boolean);

  return (
    <>
      <div className="hello disp">Smart home and voice</div>
      <div className="sub">Ask HOP out loud, track it on your watch, and let a verified rep in when you are not home.</div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {HOMEDEV.map(([k, i, n, d]) => (
          <div className="it" key={k}>
            <div className="ico t">{i}</div>
            <div className="grow">
              <b>{n}</b>
              <small>{homeConn[k] ? "Connected · ready (sample)" : d}</small>
            </div>
            <button
              className={`btn ${homeConn[k] ? "o" : "p"}`}
              style={{ padding: "7px 12px", fontSize: 12 }}
              disabled={pending === k}
              onClick={() => {
                if (homeConn[k]) {
                  setHomeConn({ ...homeConn, [k]: false });
                  toast(`${n} disconnected.`);
                } else {
                  setPending(k);
                  setTimeout(() => {
                    setPending(null);
                    setHomeConn({ ...homeConn, [k]: true });
                    toast(`${n} connected. Try saying "ask HOP".`);
                  }, 800);
                }
              }}
            >
              {pending === k ? "Connecting..." : homeConn[k] ? "Disconnect" : "Connect"}
            </button>
          </div>
        ))}
      </div>
      <div className="sect"><h2>Just say it</h2></div>
      <div className="card">
        {[["Alexa", '"Alexa, ask HOP to pick up my dry cleaning."'], ["Siri", '"Hey Siri, tell HOP I am running late for pickup."'], ["Google", '"Hey Google, ask HOP where my dinner is."'], ["Alexa", '"Alexa, ask HOP for Clutch."']].map((v, i) => (
          <div className="row" style={{ gap: 10, padding: "7px 0", alignItems: "flex-start" }} key={i}>
            <span className={`tag ${v[0] === "Siri" ? "n" : v[0] === "Google" ? "g" : "s"}`} style={{ minWidth: 56, justifyContent: "center" }}>{v[0]}</span>
            <p style={{ fontSize: 13.5, color: "var(--ink)" }}>{v[1]}</p>
          </div>
        ))}
      </div>
      <div className="sect"><h2>Added value</h2></div>
      <div className="grid2">
        {[["⌚", "Apple Watch", "Clutch button and request status on your wrist"], ["📱", "Live Activities", "Track your rep on the lock screen"], ["🤖", "Android widget", "Ask HOP from your home screen"], ["📺", "Echo Show", "See your rep arrive on screen"], ["🏠", "Arrival mode", "Lights on and porch light when you get home"], ["🔔", "Doorbell match", "Rep shows up verified on your Ring camera"]].map((t) => (
          <div className="tile" key={t[1]}>
            <div className="ico t">{t[0]}</div>
            <b>{t[1]}</b>
            <span>{t[2]}</span>
          </div>
        ))}
      </div>
      <div className="sect"><h2>Home access for HOP reps</h2></div>
      <div className="card">
        <p style={{ marginBottom: 10 }}>When a HOP rep is at your door</p>
        {[["ask", "Ask me each time", "You approve every unlock from your phone or watch"], ["window", "Allow during my delivery window", "Only for that job, only for that time"], ["never", "Never unlock", "Rep leaves it at the door or a neighbor"]].map(([k, l, s]) => (
          <button
            key={k}
            className={`chk ${entry === k ? "on" : ""}`}
            style={{ alignItems: "flex-start", textDecoration: "none", color: "var(--ink)" }}
            onClick={() => {
              setEntry(k);
              toast("Home access setting saved.");
            }}
          >
            <span style={{ borderRadius: "50%" }}>{entry === k ? "✓" : ""}</span>
            <div>
              <b style={{ fontSize: 13.5, display: "block" }}>{l}</b>
              <small style={{ fontSize: 12, color: "var(--muted)" }}>{s}</small>
            </div>
          </button>
        ))}
        <p className="mock" style={{ textAlign: "left" }}>
          {any ? "" : "Connect a smart lock above to turn this on. "}Every unlock relocks on its own, and you get a photo when the job is done. [CONFIRM smart lock partners]
        </p>
      </div>
      <div className="card">
        <small className="kick">Access log</small>
        <div className="tl" style={{ marginTop: 8 }}>
          <div><small>Tue 3:12 PM</small>Unlocked for Renee, HOP rep · pharmacy drop off</div>
          <div><small>Tue 3:16 PM</small>Locked again · photo verified ✓</div>
          <div><small>Sat 1:02 PM</small>Unlocked for dog walk with Biscuit · relocked 1:41 PM</div>
        </div>
      </div>
      <p className="mock">Sample devices and access log. Nothing here is connected yet.</p>
      <button className="btn o w" onClick={() => go("you")}>Back to profile</button>
    </>
  );
}
