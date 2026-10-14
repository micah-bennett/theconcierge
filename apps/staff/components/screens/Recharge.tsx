"use client";
import { useEffect, useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { EARN, TAUGHT_KEY, TIERS, type EarnGroup } from "@/lib/content";
import { Bars } from "../bits";
import { ConnectSheet } from "../sheets";
import { useConnections, useStaff } from "../store";

/**
 * Mockup `me`: Recharge points (real balance, real once-per-period claims), tier progress from
 * lifetime points, earn lists, redeem, challenges, leaderboard (sample), wellbeing (sample) and the
 * breathing reset. TODO(IT): server-verify earn events before points have cash value.
 */
export function Recharge() {
  const { profile, patch, go } = useStaff();
  const { openSheet, toast } = usePhone();
  const conn = useConnections();
  const [q, setQ] = useState<EarnGroup>("daily");
  const [lbOn, setLbOn] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [br, setBr] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setBr((k) => (k + 1) % 4), 2000);
    return () => clearInterval(t);
  }, []);

  const points = profile?.points ?? 0;
  const life = profile?.lifetimePoints ?? 0;
  const claimed = new Set(profile?.claimed ?? []);
  const t = TIERS.filter((x) => life >= x[1]).pop()!;
  const n = TIERS[TIERS.indexOf(t) + 1];
  const pct = n ? Math.round(((life - t[1]) / (n[1] - t[1])) * 100) : 100;
  const taught = (profile?.prefs ?? []).filter((p) => p.k === TAUGHT_KEY).length;

  async function claim(k: string) {
    if (k === "connect" && !conn.wear) return openSheet(<ConnectSheet />);
    if (k === "profile" && taught < 3) return go("know");
    setBusy(k);
    const r = await patch({ claim: k });
    setBusy(null);
    if (!r) return;
    toast(r.added ? `+${r.added} points. Nice work.` : "Already counted for this period.");
  }

  // Sample leaderboard; "You" shows your real lifetime points. [CONFIRM leaderboard is opt in]
  const L: [string, string, number][] = [["J. Okafor", "ICU", 6120], ["R. Mehta", "Cardiology", 5340], ["T. Brooks", "Ortho", 4510], ["L. Santos", "Peds", 4205], ["You", profile?.unitName || "Your unit", life]];
  const board = L.filter((l) => lbOn || l[0] !== "You").sort((a, b) => b[2] - a[2]);

  return (
    <>
      <div className="hello disp">Recharge</div>
      <div className="sub">Rest is part of the job. HOP rewards it.</div>
      <div className="points">
        <small style={{ opacity: 0.8, fontWeight: 700, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase" }}>Recharge Points</small>
        <div className="num">{profile ? points.toLocaleString() : "…"}</div>
        <p style={{ fontSize: 13, opacity: 0.85 }}>Earn points for rest, breaks, and looking after your team.</p>
      </div>
      <div className="card">
        <div className="row between">
          <div>
            <small className="kick">Your level</small>
            <h3 style={{ fontSize: 18, marginTop: 2 }}>{t[0]} member</h3>
            <p style={{ fontSize: 12.5 }}>{t[2]}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <b style={{ fontFamily: "Montserrat", fontSize: 18, color: "var(--navy)" }}>{life.toLocaleString()}</b>
            <small style={{ display: "block", fontSize: 11, color: "var(--muted)" }}>lifetime pts</small>
          </div>
        </div>
        <div className="pbar" style={{ marginTop: 10 }}><i style={{ width: `${pct}%` }} /></div>
        <p style={{ fontSize: 12, marginTop: 6 }}>{n ? `${(n[1] - life).toLocaleString()} pts to ${n[0]} · ${n[2]}` : "Top level reached"}</p>
        <div className="row" style={{ gap: 8, marginTop: 10, background: "#fff7ec", borderRadius: 12, padding: "8px 10px" }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          {/* Sample streak until check-ins are tracked. */}
          <p style={{ fontSize: 12.5, color: "var(--ink)" }}><b>6 day streak.</b> Check in tomorrow for double points.</p>
        </div>
      </div>
      <div className="sect">
        <h2>Earn more points</h2>
        <span style={{ fontSize: 12, color: "var(--muted)", fontWeight: 700 }}>{claimed.size} done</span>
      </div>
      <div className="subtabs">
        {([["daily", "Today"], ["weekly", "This week"], ["big", "Big wins"]] as [EarnGroup, string][]).map(([k, l]) => (
          <button key={k} className={q === k ? "on" : ""} onClick={() => setQ(k)}>{l}</button>
        ))}
      </div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {EARN[q].map(([k, i, label, p]) => (
          <div className="it" key={k}>
            <div className="ico t">{i}</div>
            <div className="grow">
              <b style={{ fontSize: 13.5 }}>{label}</b>
              <small>+{p} pts</small>
            </div>
            {claimed.has(k) ? (
              <span className="tag">Done ✓</span>
            ) : (
              <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} disabled={!profile || busy === k} onClick={() => claim(k)}>
                {k === "connect" && !conn.wear ? "Connect" : k === "profile" && taught < 3 ? "Open" : "Mark done"}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mock">TODO(IT): verify points server side (watch data, shift system, CEU provider) before rewards have cash value.</p>
      <div className="sect"><h2>Redeem</h2></div>
      <div className="card list">
        {([["🚙", "s", "Car detail", 1000, "n"], ["🥗", "t", "A week of meal prep", 1500, "o"], ["🧹", "g", "Whole house clean", 2000, "o"]] as const).map(([i, c, l, p, b]) => (
          <div className="it" key={l}>
            <div className={`ico ${c}`}>{i}</div>
            <div className="grow">
              <b>{l}</b>
              <small>{p.toLocaleString()} pts</small>
            </div>
            <button
              className={`btn ${b}`}
              style={{ padding: "7px 12px", fontSize: 12 }}
              onClick={() => toast(points >= p ? "Redeeming opens soon. Your points are safe." : "A few more rest days to go for this one.")}
            >
              Redeem
            </button>
          </div>
        ))}
      </div>
      <p className="mock">Redeeming is not open yet. [CONFIRM reward catalog and fulfillment]</p>
      <div className="sect"><h2>Active challenges</h2></div>
      <div className="card">
        {([["💧", "Hydration streak", "8 glasses a day · 12 days", 80], ["👟", "Steps challenge", "10k steps · 5 days", 64], ["🌙", "Wind down by 10 PM", "5 nights · 2 done", 45]] as const).map((c) => (
          <div style={{ marginBottom: 12 }} key={c[1]}>
            <div className="row between">
              <b style={{ fontSize: 14 }}>{c[0]} {c[1]}</b>
              <small style={{ color: "var(--muted)", fontSize: 12 }}>{c[3]}%</small>
            </div>
            <small style={{ color: "var(--muted)", fontSize: 12 }}>{c[2]}</small>
            <div className="pbar"><i style={{ width: `${c[3]}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="sect">
        <h2>Leaderboard</h2>
        <a role="button" onClick={() => setLbOn(!lbOn)}>{lbOn ? "Hide me" : "Show me"}</a>
      </div>
      <div className="card list lb" style={{ padding: "4px 16px" }}>
        {board.map((l, idx) => (
          <div className={`it ${l[0] === "You" ? "you" : ""}`} key={l[0]}>
            <span className="rk">{idx + 1}</span>
            <div className="grow">
              <b>{l[0]}</b>
              <small>{l[1]}</small>
            </div>
            <b style={{ fontFamily: "Montserrat", color: "var(--navy)" }}>{l[2].toLocaleString()}</b>
          </div>
        ))}
      </div>
      <div className="sect"><h2>Your wellbeing</h2></div>
      <div className="card">
        <h3>Sleep this week</h3>
        <p style={{ fontSize: 12 }}>Hours per night · sample</p>
        <Bars arr={[["M", 6.8], ["T", 7.1], ["W", 5.9], ["T", 6.2], ["F", 5.2], ["S", 7.8], ["S", 8.1]]} max={9} col="var(--sky)" />
      </div>
      <div className="card">
        <h3>Mood this week</h3>
        <p style={{ fontSize: 12 }}>Your check ins, 1 to 10 · sample</p>
        <Bars arr={[["M", 7], ["T", 6], ["W", 5], ["T", 6], ["F", 4], ["S", 8], ["S", 8]]} max={10} col="var(--teal)" />
      </div>
      <div className="sect"><h2>Five Minute Reset</h2></div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="ring"><div>{["Breathe in", "Hold", "Breathe out", "Hold"][br]}</div></div>
        <h3>Box breathing for the break room</h3>
        <p style={{ marginBottom: 12 }}>Four counts in, hold, four counts out. Headphones optional.</p>
        <div>
          <span className="chip on">Breathe</span> <span className="chip">Stretch</span> <span className="chip">Quiet room</span>
        </div>
      </div>
      <div className="card">
        <div className="row">
          <div className="ico c">💌</div>
          <div>
            <h3>Notes that matter</h3>
            <p>When a family leaves a thank you, it lands here so you can read it on your break.</p>
          </div>
        </div>
      </div>
    </>
  );
}
