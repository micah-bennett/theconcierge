"use client";
import { useEffect, useState } from "react";
import { j } from "@hop/shared/client";
import { usePhone } from "@hop/shared/ui/Phone";
import { CATS, greet, type Cat } from "@/lib/roles";
import { shiftNow } from "@/lib/shift";
import type { PlayState } from "@/lib/types";
import { Svg, ic } from "../bits";
import { CheckInCard } from "../CheckIn";
import { DoorCards, ReqRow } from "../Requests";
import { ClutchSheet, ComposeSheet, RescueSheet } from "../sheets";
import { useStaff } from "../store";

/**
 * Today: greeting, door approvals, the daily check-in, your shift (from your own pattern),
 * Overtime Rescue, Clutch, Ask HOP, your requests and today's Learn & Play. Everything is real.
 */
export function Today() {
  const { profile, me, requests, go } = useStaff();
  const { openSheet } = usePhone();
  const [openReq, setOpenReq] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const compose = (cat: Cat, seed?: string) => openSheet(<ComposeSheet cat={cat} seed={seed} />);
  const open = (requests || []).filter((r) => r.status !== "cancelled" && r.jobStatus !== "completed" && r.status !== "completed");
  const toRate = (requests || []).filter((r) => r.jobStatus === "completed" && !r.rating);
  const list = showAll ? requests || [] : [...open, ...toRate];

  return (
    <>
      <div className="hello disp">
        {greet()}, {profile?.firstName ?? ""}
      </div>
      <div className="sub">{[profile?.jobTitle, profile?.unitName].filter(Boolean).join(" · ")}</div>
      <DoorCards />
      <CheckInCard />
      <ShiftCard />
      <div className="card" style={{ borderColor: "#f3c3bf", background: "#fff7f6" }}>
        <div className="row">
          <div className="ico c">⏰</div>
          <div>
            <h3>Asked to stay late?</h3>
            <p>One tap and HOP covers tonight: pickups, pets, and dinner.</p>
          </div>
        </div>
        <button className="btn c w" style={{ marginTop: 12 }} onClick={() => openSheet(<RescueSheet />)}>
          Overtime Rescue
        </button>
      </div>
      <button className="clutch" onClick={() => openSheet(<ClutchSheet />)}>
        <span className="cz">⚡</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          <b>In a bind? Hit Clutch.</b>
          <small>HOP drops everything and calls you back fast</small>
        </span>
        <span style={{ fontSize: 20 }}>›</span>
      </button>
      <div className="card">
        <h3>Ask HOP for anything</h3>
        <p>Pick a category. HOP finds the best help, tracks it, and confirms it is done.</p>
        <button className="askbar" onClick={() => compose("errand")}>
          <Svg p={ic.search} size={18} />
          What can we take off your plate?
        </button>
        <div className="cats" style={{ marginTop: 10, gridTemplateColumns: "repeat(6,1fr)" }}>
          {(Object.keys(CATS) as Cat[]).map((k) => (
            <button key={k} className="cat" onClick={() => compose(k)}>
              <span>{CATS[k][0]}</span>
              {CATS[k][1]}
            </button>
          ))}
        </div>
      </div>
      <div className="sect">
        <h2>Your requests</h2>
        {requests && requests.length > list.length ? (
          <a role="button" onClick={() => setShowAll(true)}>See all {requests.length}</a>
        ) : (
          <a role="button" onClick={() => compose("errand")}>New</a>
        )}
      </div>
      <div className="card" style={{ padding: "4px 16px" }}>
        {requests === null ? (
          <p className="mock" style={{ textAlign: "left" }}>Loading your requests…</p>
        ) : list.length ? (
          list.map((r) => <ReqRow key={r.id} r={r} open={openReq === r.id} onToggle={() => setOpenReq(openReq === r.id ? null : r.id)} />)
        ) : (
          <p className="mock" style={{ textAlign: "left" }}>{requests.length ? "Nothing open right now." : "No requests yet. Ask HOP for anything above and watch it here."}</p>
        )}
      </div>
      <PlayCard />
      {me && me.streak > 0 && (
        <p className="mock">
          🔥 {me.streak} day check-in streak.{" "}
          <a role="button" style={{ color: "var(--teal)", fontWeight: 700, cursor: "pointer" }} onClick={() => go("me")}>
            See Recharge
          </a>
        </p>
      )}
    </>
  );
}

/** Your shift, from the pattern you saved in You. No pattern → a prompt to add it. */
function ShiftCard() {
  const { me, go } = useStaff();
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 60000);
    return () => clearInterval(t);
  }, []);
  if (!me) return null;
  if (!me.shift) {
    return (
      <div className="card" style={{ background: "var(--soft-sky)", borderColor: "#cfe3f7" }}>
        <div className="row">
          <div className="ico" style={{ background: "#fff" }}>🗓️</div>
          <div>
            <h3>Add your shifts</h3>
            <p>Tell HOP which days you work and when. Your week and delivery windows plan around them.</p>
          </div>
        </div>
        <button className="btn n w" style={{ marginTop: 12 }} onClick={() => go("you")}>
          Add my shifts
        </button>
      </div>
    );
  }
  const s = shiftNow(me.shift);
  return (
    <div className="shiftbar" role="button" tabIndex={0} onClick={() => go("plan")} onKeyDown={(e) => e.key === "Enter" && go("plan")} style={{ cursor: "pointer" }}>
      <small>{s.label}</small>
      <div className="big">{s.state}</div>
      <div className="meta">{s.meta}</div>
      <div className="prog">
        <i style={{ width: `${Math.max(0, Math.min(100, s.progress))}%` }} />
      </div>
    </div>
  );
}

/** Today's Learn & Play at a glance; opens Recharge → Learn & Play. */
function PlayCard() {
  const { go, setRechargeTab } = useStaff();
  const [play, setPlay] = useState<PlayState | null>(null);
  useEffect(() => {
    j<{ play: PlayState }>("/api/play").then((r) => setPlay(r.play)).catch(() => {});
  }, []);
  const done = play ? [play.quiz, play.words, play.match, play.read].filter((g) => g.played).length : 0;
  return (
    <div className="card">
      <div className="row between">
        <div className="row">
          <div className="ico g">🧩</div>
          <div>
            <h3>Today&apos;s Learn &amp; Play</h3>
            <p>{play ? (done === 4 ? `All done today · +${play.pointsToday} points` : `${done} of 4 played · a quiz, a word puzzle, a match and a Did you know?`) : "A quick quiz, a word puzzle and more about HOP."}</p>
          </div>
        </div>
      </div>
      {play && done < 4 && <p style={{ fontSize: 13, marginTop: 8, color: "var(--ink)" }}>Did you know? {play.read.title}.</p>}
      <button
        className="btn p w"
        style={{ marginTop: 12 }}
        onClick={() => {
          setRechargeTab("play");
          go("me");
        }}
      >
        {done === 4 ? "See today's results" : "Play now"}
      </button>
    </div>
  );
}
