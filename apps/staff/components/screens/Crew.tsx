"use client";
import { useState } from "react";
import { MIN_GROUP_SIZE } from "@hop/shared/brand";
import { usePhone } from "@hop/shared/ui/Phone";
import { PULSE_WORDS, SOCIAL_POINTS } from "@/lib/content";
import { ComingSoon } from "../bits";
import { useStaff } from "../store";

const SUB: [string, string][] = [["pulse", "Pulse"], ["refer", "Invite"], ["community", "Community"]];

/**
 * Crew: the weekly pulse (stored as a 'pulse' check-in; unit results only at 5+ people), your
 * invite link with the real count of people who joined with it, and a Coming soon card for the
 * community (groups, feed, news).
 */
export function Crew() {
  const { me, act } = useStaff();
  const { toast } = usePhone();
  const [crew, setCrew] = useState("pulse");
  const [editing, setEditing] = useState(false);
  const [scale, setScale] = useState<number | null>(null);
  const [mood, setMood] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const pulse = me?.pulse;

  async function submit() {
    if (!scale) return toast("Pick how supported you felt, 1 to 5.");
    setBusy(true);
    const r = await act("pulse", { supported: scale, word: mood.trim() });
    setBusy(false);
    if (!r) return;
    setEditing(false);
    toast(r.added ? `Thanks. +${r.added} points for answering.` : "Thanks. Your answer is updated.");
  }

  async function share() {
    if (!me) return;
    const text = `Join me on HOP. Sign up with my link: ${me.referral.url}`;
    try {
      if (navigator.share) await navigator.share({ title: "HOP", text, url: me.referral.url });
      else {
        await navigator.clipboard.writeText(text);
        toast("Invite link copied. Paste it anywhere.");
      }
    } catch {
      /* cancelled */
    }
  }

  return (
    <>
      <div className="hello disp">Crew</div>
      <div className="sub">Your team, your voice, and colleagues who get it.</div>
      <div className="subtabs">
        {SUB.map(([k, l]) => (
          <button key={k} className={crew === k ? "on" : ""} onClick={() => setCrew(k)}>{l}</button>
        ))}
      </div>
      {crew === "pulse" && !pulse && <p className="mock">Loading…</p>}
      {crew === "pulse" &&
        pulse &&
        (pulse.mine && !editing ? (
          <>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 34 }}>💙</div>
              <h3>Thanks for answering this week</h3>
              <p>
                You said {pulse.mine.supported} of 5{pulse.mine.word ? ` · "${pulse.mine.word}"` : ""}. Your unit only ever sees totals.
              </p>
              <button
                className="btn o"
                style={{ marginTop: 10, padding: "7px 12px", fontSize: 12 }}
                onClick={() => {
                  setScale(pulse.mine!.supported);
                  setMood(pulse.mine!.word);
                  setEditing(true);
                }}
              >
                Change my answer
              </button>
            </div>
            <div className="card">
              <h3>Your unit this week</h3>
              {pulse.results ? (
                <>
                  <p style={{ fontSize: 12, marginBottom: 8 }}>{pulse.respondents} people answered</p>
                  <div className="row between" style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13.5 }}>Felt supported (4 or 5)</span>
                    <b style={{ color: "var(--navy)" }}>{pulse.results.supportedPct}%</b>
                  </div>
                  <div className="row between" style={{ padding: "6px 0" }}>
                    <span style={{ fontSize: 13.5 }}>Average</span>
                    <b style={{ color: "var(--navy)" }}>{pulse.results.avgSupported} of 5</b>
                  </div>
                  {pulse.results.words.length > 0 && (
                    <div className="moods">
                      {pulse.results.words.map(([w, n]) => (
                        <span key={w} className="chip" style={{ cursor: "default" }}>
                          {w} · {n}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p>
                  Results show once {MIN_GROUP_SIZE} people on your unit answer. {pulse.respondents} so far.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div className="card">
              <h3>This week, how supported did you feel at work?</h3>
              <div className="scale" style={{ marginTop: 10 }}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button key={v} className={scale === v ? "on" : ""} onClick={() => setScale(v)}>{v}</button>
                ))}
              </div>
              <p style={{ fontSize: 12, marginTop: 6 }}>1 not at all · 5 very supported</p>
            </div>
            <div className="card">
              <h3>A word for how this week felt?</h3>
              <div className="moods">
                {PULSE_WORDS.map((m) => (
                  <button key={m} className={`chip ${mood === m ? "on" : ""}`} onClick={() => setMood(mood === m ? "" : m)}>{m}</button>
                ))}
              </div>
              <input
                className="field"
                maxLength={24}
                placeholder="Or your own word (optional)"
                value={PULSE_WORDS.includes(mood) ? "" : mood}
                onChange={(e) => setMood(e.target.value.replace(/[^\p{L}' -]/gu, ""))}
              />
            </div>
            <button className="btn p w" disabled={busy || !scale} onClick={submit}>{busy ? "Sending…" : pulse.mine ? "Update my answer" : "Send my answer"}</button>
            <p className="mock">One answer a week. Your unit sees totals only when {MIN_GROUP_SIZE} or more people answer, never who said what.</p>
          </>
        ))}
      {crew === "refer" && (
        <>
          <div className="points" style={{ background: "linear-gradient(135deg,var(--teal),#028a8c)" }}>
            <small style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.85 }}>Your invite code</small>
            <div className="num" style={{ fontSize: 28, letterSpacing: ".06em" }}>{me?.referral.code ?? "…"}</div>
            <p style={{ fontSize: 13, opacity: 0.9 }}>Bring a colleague. When they join with your link, you get 150 points. [CONFIRM referral rules]</p>
          </div>
          <div className="grid2">
            <div className="tile">
              <b style={{ fontSize: 22, fontFamily: "Montserrat" }}>{me?.referral.joined ?? "…"}</b>
              <span>Joined with your link</span>
            </div>
            <div className="tile">
              <b style={{ fontSize: 22, fontFamily: "Montserrat" }}>+{SOCIAL_POINTS.share}</b>
              <span>Points a week for sharing HOP (in Recharge)</span>
            </div>
          </div>
          <button className="btn n w" disabled={!me} onClick={share}>Share invite link</button>
          {me && <p className="mock" style={{ wordBreak: "break-all" }}>{me.referral.url}</p>}
        </>
      )}
      {crew === "community" && (
        <ComingSoon feature="crew-community" icon="👥" text="Groups for night shift, new parents and more, a feed for shout outs, and HOP news. Opt in, and you choose what to share." />
      )}
    </>
  );
}
