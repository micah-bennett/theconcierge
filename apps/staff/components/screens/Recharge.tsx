"use client";
import { useEffect, useRef, useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { EARN, HIDE_LB_KEY, REWARDS, SERVER_EARNS, SOCIAL_POINTS, TAUGHT_KEY, TIERS, type EarnGroup } from "@/lib/content";
import { Bars, ComingSoon } from "../bits";
import { LearnPlay } from "../LearnPlay";
import { ConnectSheet } from "../sheets";
import { useConnections, useStaff, type RechargeTab } from "../store";

/**
 * Recharge: points (real balance and once-per-period claims), tier from lifetime points, streak
 * from check-ins, earn lists, social earns, real redeem, challenges and the leaderboard (both from
 * the database), Learn & Play, and wellbeing charts from the member's own check-ins.
 * TODO(IT): server-verify honour-system earns before points have cash value.
 */
export function Recharge() {
  const { rechargeTab, setRechargeTab } = useStaff();
  return (
    <>
      <div className="hello disp">Recharge</div>
      <div className="sub">Rest is part of the job. HOP rewards it.</div>
      <div className="subtabs">
        {([["points", "Points"], ["play", "Learn & Play"], ["wellbeing", "Wellbeing"]] as [RechargeTab, string][]).map(([k, l]) => (
          <button key={k} className={rechargeTab === k ? "on" : ""} onClick={() => setRechargeTab(k)}>
            {l}
          </button>
        ))}
      </div>
      {rechargeTab === "points" && <Points />}
      {rechargeTab === "play" && <LearnPlay />}
      {rechargeTab === "wellbeing" && <Wellbeing />}
    </>
  );
}

function Points() {
  const { profile, me, patch, act, go, setRechargeTab, consentOn, setConsent, refreshMe } = useStaff();
  const { openSheet, toast } = usePhone();
  const conn = useConnections();
  const [q, setQ] = useState<EarnGroup>("daily");
  const [busy, setBusy] = useState<string | null>(null);

  const points = profile?.points ?? 0;
  const life = profile?.lifetimePoints ?? 0;
  const claimed = new Set(profile?.claimed ?? []);
  const t = TIERS.filter((x) => life >= x[1]).pop()!;
  const n = TIERS[TIERS.indexOf(t) + 1];
  const pct = n ? Math.round(((life - t[1]) / (n[1] - t[1])) * 100) : 100;
  const taught = (profile?.prefs ?? []).filter((p) => p.k === TAUGHT_KEY).length;
  const streak = me?.streak ?? 0;
  const hidden = consentOn(HIDE_LB_KEY, false);

  async function claim(k: string) {
    if (k === "connect" && !conn.wear) return openSheet(<ConnectSheet />);
    if (k === "profile" && taught < 3) return go("know");
    if (k === "check" || k === "rate") return go("home");
    if (k === "pulse") return go("crew");
    if (k === "reset") return setRechargeTab("wellbeing");
    setBusy(k);
    const r = await patch({ claim: k });
    setBusy(null);
    if (!r) return;
    toast(r.added ? `+${r.added} points. Nice work.` : "Already counted for this period.");
  }

  const label = (k: string) =>
    k === "connect" && !conn.wear ? "Connect" : k === "profile" && taught < 3 ? "Open" : k === "check" ? "Check in" : k === "pulse" ? "Answer" : k === "rate" ? "Rate one" : k === "reset" ? "Start" : "Mark done";

  async function redeem(key: string, cost: number, name: string) {
    if (points < cost) return toast("A few more rest days to go for this one.");
    if (!window.confirm(`Spend ${cost.toLocaleString()} points on ${name}? HOP will reach out to set it up.`)) return;
    setBusy(`r:${key}`);
    const r = await act("redeem", { rewardKey: key });
    setBusy(null);
    if (r) toast(`Redeemed. HOP will reach out to arrange your ${name.toLowerCase()}.`);
  }

  const ch = me?.challenges;
  const challenges: [string, string, number, number][] = ch
    ? [
        ["💬", "Check in 5 days this week", ch.checkinDays, 5],
        ["🧩", "Play Learn & Play on 3 days", ch.playDays, 3],
        ["📝", "Answer this week's pulse", ch.pulseDone ? 1 : 0, 1]
      ]
    : [];

  return (
    <>
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
          <p style={{ fontSize: 12.5, color: "var(--ink)" }}>
            {streak ? (
              <>
                <b>{streak} day streak.</b> {streak >= 7 ? "Seven days and counting." : `Check in ${7 - streak} more day${7 - streak === 1 ? "" : "s"} in a row for the 7 day bonus.`}
              </>
            ) : (
              <>Check in today to start a streak.</>
            )}
          </p>
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
        {EARN[q].map(([k, i, lbl, p]) => (
          <div className="it" key={k}>
            <div className="ico t">{i}</div>
            <div className="grow">
              <b style={{ fontSize: 13.5 }}>{lbl}</b>
              <small>+{p} pts{k === "streak" || k === "refer" ? " · added for you" : ""}</small>
            </div>
            {claimed.has(k) ? (
              <span className="tag">Done ✓</span>
            ) : k === "streak" || k === "refer" ? (
              <button className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => (k === "refer" ? go("crew") : go("home"))}>
                {k === "refer" ? "Invite" : "Check in"}
              </button>
            ) : (
              <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} disabled={!profile || busy === k} onClick={() => claim(k)}>
                {label(k)}
              </button>
            )}
          </div>
        ))}
      </div>
      <p className="mock">
        {SERVER_EARNS.length} of these are added automatically when they happen. The rest are on the honour system. TODO(IT): verify them (watch, shift system, CEU provider) before rewards have cash value.
      </p>
      <Social />
      <div className="sect"><h2>Redeem</h2></div>
      <div className="card list">
        {REWARDS.map((r) => (
          <div className="it" key={r.key}>
            <div className={`ico ${r.cls}`}>{r.icon}</div>
            <div className="grow">
              <b>{r.name}</b>
              <small>{r.cost.toLocaleString()} pts</small>
            </div>
            <button className={`btn ${points >= r.cost ? "p" : "o"}`} style={{ padding: "7px 12px", fontSize: 12 }} disabled={!profile || busy === `r:${r.key}`} onClick={() => redeem(r.key, r.cost, r.name)}>
              {busy === `r:${r.key}` ? "…" : "Redeem"}
            </button>
          </div>
        ))}
      </div>
      {me && me.redemptions.length > 0 && (
        <div className="card list" style={{ padding: "4px 16px" }}>
          {me.redemptions.map((x) => (
            <div className="it" key={x.id}>
              <div className="grow">
                <b>{x.name}</b>
                <small>
                  {new Date(x.at).toLocaleDateString("en-US", { month: "short", day: "numeric" })} · {x.points.toLocaleString()} pts
                </small>
              </div>
              <span className={`tag ${x.status === "Completed" ? "" : x.status === "Cancelled" ? "c" : "s"}`}>{x.status}</span>
            </div>
          ))}
        </div>
      )}
      <p className="mock">Redeeming spends the points and sends the request to the HOP team, who arrange it with you. [CONFIRM reward catalog, prices and fulfillment]</p>
      <div className="sect"><h2>This week&apos;s challenges</h2></div>
      <div className="card">
        {!ch && <p className="mock" style={{ textAlign: "left" }}>Loading…</p>}
        {challenges.map(([i, l, v, max]) => (
          <div style={{ marginBottom: 12 }} key={l}>
            <div className="row between">
              <b style={{ fontSize: 14 }}>{i} {l}</b>
              <small style={{ color: "var(--muted)", fontSize: 12 }}>
                {Math.min(v, max)} of {max}
              </small>
            </div>
            <div className="pbar"><i style={{ width: `${Math.min(100, Math.round((v / max) * 100))}%` }} /></div>
          </div>
        ))}
      </div>
      <div className="sect">
        <h2>Leaderboard · this month</h2>
        <a role="button" onClick={() => setConsent(HIDE_LB_KEY, !hidden).then(refreshMe)}>
          {hidden ? "Show me" : "Hide me"}
        </a>
      </div>
      <Leaderboard />
    </>
  );
}

function Leaderboard() {
  const { me, consentOn } = useStaff();
  const lb = me?.leaderboard;
  const hidden = consentOn(HIDE_LB_KEY, false);
  return (
    <>
      <div className="card list lb" style={{ padding: "4px 16px" }}>
        {!lb && <p className="mock" style={{ textAlign: "left" }}>Loading…</p>}
        {lb && !lb.rows.length && <p className="mock" style={{ textAlign: "left" }}>No points earned at your facility yet this month. Check in to get on the board.</p>}
        {lb?.rows
          .filter((r) => !(r.me && hidden))
          .map((r, i) => (
            <div className={`it ${r.me ? "you" : ""}`} key={`${r.rank}-${r.name}-${i}`}>
              <span className="rk">{r.rank}</span>
              <div className="grow">
                <b>{r.me ? `${r.name} (you)` : r.name}</b>
                <small>{r.unit || ""}</small>
              </div>
              <b style={{ fontFamily: "Montserrat", color: "var(--navy)" }}>{r.points.toLocaleString()}</b>
            </div>
          ))}
      </div>
      {lb && (
        <p className="mock">
          {hidden
            ? "You're hidden from the leaderboard. Others can't see you."
            : lb.myRank
              ? lb.myRank > 10
                ? `You're #${lb.myRank} with ${lb.myPoints.toLocaleString()} points this month.`
                : `You have ${lb.myPoints.toLocaleString()} points this month.`
              : "Earn points this month to show up here."}{" "}
          Staff at your facility, first name and last initial only.
        </p>
      )}
    </>
  );
}

/** Follow HOP, read the blog, share HOP. Networks come from the server's SOCIAL_LINKS; unset ones don't show. */
function Social() {
  const { me, act } = useStaff();
  const { toast } = usePhone();
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [busy, setBusy] = useState<string | null>(null);
  if (!me) return null;
  const claimed = new Set(me.social.claimed);

  async function claim(key: string, body: { kind: "follow" | "blog" | "share"; network?: string }) {
    setBusy(key);
    const r = await act("social", body);
    setBusy(null);
    if (r) toast(r.added ? `+${r.added} points. Thank you.` : "Already counted.");
  }

  async function share() {
    const text = `I use HOP for errands and help on busy shifts. Join me: ${me!.referral.url}`;
    try {
      if (navigator.share) await navigator.share({ title: "HOP", text, url: me!.referral.url });
      else {
        await navigator.clipboard.writeText(text);
        toast("Link copied. Paste it anywhere.");
      }
    } catch {
      return; // cancelled
    }
    if (!claimed.has("social:share")) claim("social:share", { kind: "share" });
  }

  const row = (key: string, icon: string, title: string, pts: number, period: string, action: React.ReactNode) => (
    <div className="it" key={key}>
      <div className="ico s">{icon}</div>
      <div className="grow">
        <b style={{ fontSize: 13.5 }}>{title}</b>
        <small>
          +{pts} pts · {period}
        </small>
      </div>
      {claimed.has(key) ? <span className="tag">Done ✓</span> : action}
    </div>
  );
  const btn = (text: string, onClick: () => void, cls = "p", key?: string) => (
    <button className={`btn ${cls}`} style={{ padding: "7px 12px", fontSize: 12 }} disabled={!!key && busy === key} onClick={onClick}>
      {text}
    </button>
  );

  return (
    <>
      <div className="sect"><h2>Follow and share</h2></div>
      <div className="card list" style={{ padding: "4px 16px" }}>
        {me.social.networks.map((s) => {
          const key = `social:follow:${s.key}`;
          return row(
            key,
            "📣",
            `Follow HOP on ${s.label}`,
            SOCIAL_POINTS.follow,
            "once",
            opened[key]
              ? btn("I followed", () => claim(key, { kind: "follow", network: s.key }), "p", key)
              : btn("Open", () => {
                  window.open(s.url, "_blank", "noopener,noreferrer");
                  setOpened((o) => ({ ...o, [key]: true }));
                }, "o")
          );
        })}
        {row(
          "social:blog",
          "📰",
          "Read the HOP blog",
          SOCIAL_POINTS.blog,
          "daily",
          opened["social:blog"]
            ? btn("I read it", () => claim("social:blog", { kind: "blog" }), "p", "social:blog")
            : btn("Open", () => {
                window.open(me.social.blog, "_blank", "noopener,noreferrer");
                setOpened((o) => ({ ...o, "social:blog": true }));
              }, "o")
        )}
        {row("social:share", "💌", "Share HOP with a colleague", SOCIAL_POINTS.share, "weekly", btn("Share", share, "p", "social:share"))}
      </div>
    </>
  );
}

const PHASES = ["Breathe in", "Hold", "Breathe out", "Hold"];
const RESET_SECONDS = 300;

function Wellbeing() {
  const { me, profile, patch } = useStaff();
  const { toast } = usePhone();
  const [br, setBr] = useState(0);
  const [running, setRunning] = useState(false);
  const [left, setLeft] = useState(RESET_SECONDS);
  const endAt = useRef(0);

  useEffect(() => {
    const t = setInterval(() => setBr((k) => (k + 1) % 4), 4000);
    return () => clearInterval(t);
  }, []);

  // Points only after the full five minutes have passed.
  useEffect(() => {
    if (!running) return;
    const t = setInterval(async () => {
      const s = Math.max(0, Math.round((endAt.current - Date.now()) / 1000));
      setLeft(s);
      if (s === 0) {
        clearInterval(t);
        setRunning(false);
        const r = await patch({ claim: "reset" });
        toast(r?.added ? `Reset done. +${r.added} points.` : "Reset done. Nice work.");
      }
    }, 1000);
    return () => clearInterval(t);
  }, [running, patch, toast]);

  // The last 14 ET days, oldest first, with my check-in (or a gap) on each.
  const days: string[] = [];
  if (me) {
    const d0 = new Date(`${me.day}T12:00:00Z`);
    for (let i = 13; i >= 0; i--) days.push(new Date(d0.getTime() - i * 86400000).toISOString().slice(0, 10));
  }
  const by = new Map((me?.history ?? []).map((c) => [c.day, c]));
  const label = (d: string) => String(Number(d.slice(8)));
  const resetDone = profile?.claimed.includes("reset");

  return (
    <>
      <div className="sect"><h2>Your wellbeing</h2></div>
      {me && !me.history.length ? (
        <div className="card">
          <h3>Your last two weeks</h3>
          <p>Check in on Today and your mood and stress show up here. Only you see this chart.</p>
        </div>
      ) : (
        <>
          <div className="card">
            <h3>Mood, last 14 days</h3>
            <p style={{ fontSize: 12 }}>Your daily check-ins, 1 rough to 5 great · only you see this</p>
            <Bars arr={days.map((d) => [label(d), by.get(d)?.mood ?? null])} max={5} col="var(--teal)" />
          </div>
          <div className="card">
            <h3>Stress, last 14 days</h3>
            <p style={{ fontSize: 12 }}>1 calm to 5 very stressed</p>
            <Bars arr={days.map((d) => [label(d), by.get(d)?.stress ?? null])} max={5} col="var(--coral)" />
          </div>
          {me && (
            <p className="mock">
              Real breaks: {me.history.filter((c) => c.tookBreak).length} of your last {me.history.length} check-ins.
            </p>
          )}
        </>
      )}
      <div className="sect"><h2>Five Minute Reset</h2></div>
      <div className="card" style={{ textAlign: "center" }}>
        <div className="ring"><div>{running ? PHASES[br] : "Ready"}</div></div>
        <h3>Box breathing for the break room</h3>
        <p style={{ marginBottom: 12 }}>Four counts in, hold, four counts out, hold. Five minutes. Headphones optional.</p>
        {running ? (
          <>
            <b style={{ fontFamily: "Montserrat", fontSize: 22, color: "var(--navy)" }}>
              {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
            </b>
            <button className="btn o w" style={{ marginTop: 10 }} onClick={() => setRunning(false)}>
              Stop
            </button>
          </>
        ) : (
          <button
            className="btn p w"
            onClick={() => {
              endAt.current = Date.now() + RESET_SECONDS * 1000;
              setLeft(RESET_SECONDS);
              setRunning(true);
            }}
          >
            {resetDone ? "Start another reset" : "Start a 5 minute reset · +15 pts"}
          </button>
        )}
      </div>
      <ComingSoon feature="watch-readiness" icon="⌚" text="Connect a watch and HOP will show sleep and recovery here, and offer help after a rough night. Nothing is read until our privacy review is done." />
    </>
  );
}
