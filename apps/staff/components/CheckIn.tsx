"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { MOOD_FACES } from "@/lib/content";
import { useStaff } from "./store";

const kick = { fontSize: 12, fontWeight: 700, color: "var(--muted)", margin: "12px 0 6px", letterSpacing: ".06em", textTransform: "uppercase" } as const;

/**
 * The daily check-in on Today: mood (5 faces), stress 1 to 5, a real break, one optional word.
 * One per ET day (POST /api/me?action=checkin upserts today's), and it earns the "check" points.
 */
export function CheckInCard() {
  const { me, act, consentOn, go } = useStaff();
  const { toast } = usePhone();
  const [editing, setEditing] = useState(false);
  const [mood, setMood] = useState<number | null>(null);
  const [stress, setStress] = useState<number | null>(null);
  const [brk, setBrk] = useState<boolean | null>(null);
  const [word, setWord] = useState("");
  const [busy, setBusy] = useState(false);

  if (!consentOn("priv:Daily mood check in")) {
    return (
      <div className="card">
        <p style={{ fontSize: 13 }}>
          Your daily check-in is off.{" "}
          <a role="button" style={{ color: "var(--teal)", fontWeight: 700, cursor: "pointer" }} onClick={() => go("you")}>
            Turn it on in Your privacy
          </a>
        </p>
      </div>
    );
  }
  if (!me) return <div className="card"><p className="mock" style={{ margin: 0, textAlign: "left" }}>Loading your check-in…</p></div>;

  const c = me.checkin;
  if (c && !editing) {
    const [face, label] = MOOD_FACES[c.mood - 1];
    return (
      <div className="card">
        <div className="row between">
          <div>
            <small className="kick">Today&apos;s check-in</small>
            <h3 style={{ marginTop: 2 }}>
              {face} {label}
              {c.word ? ` · "${c.word}"` : ""}
            </h3>
            <p style={{ fontSize: 12.5 }}>
              Stress {c.stress} of 5 · {c.tookBreak ? "Got a real break" : "No real break yet"}
              {me.streak > 1 ? ` · ${me.streak} day streak` : ""}
            </p>
          </div>
          <button
            className="btn o"
            style={{ padding: "7px 12px", fontSize: 12 }}
            onClick={() => {
              setMood(c.mood);
              setStress(c.stress);
              setBrk(c.tookBreak);
              setWord(c.word);
              setEditing(true);
            }}
          >
            Edit
          </button>
        </div>
        <p className="mock" style={{ textAlign: "left", marginTop: 8 }}>Your organization only ever sees unit totals from 5+ people.</p>
      </div>
    );
  }

  async function save() {
    if (mood == null || stress == null || brk == null) return toast("Pick a face, a stress level and whether you got a break.");
    setBusy(true);
    const r = await act("checkin", { mood, stress, tookBreak: brk, word: word.trim() });
    setBusy(false);
    if (!r) return;
    setEditing(false);
    toast(r.added ? `Thanks for checking in. +${r.added} points.` : "Check-in saved.");
  }

  return (
    <div className="card">
      <div className="row between">
        <h3>How are you doing today?</h3>
        {me.streak > 0 && <span className="tag g">🔥 {me.streak} day{me.streak === 1 ? "" : "s"}</span>}
      </div>
      <div className="row" style={{ gap: 6, marginTop: 10, justifyContent: "space-between" }} role="radiogroup" aria-label="Mood">
        {MOOD_FACES.map(([f, l], i) => (
          <button
            key={l}
            role="radio"
            aria-checked={mood === i + 1}
            aria-label={l}
            onClick={() => setMood(i + 1)}
            className="tile"
            style={{ flex: 1, padding: "8px 2px", textAlign: "center", borderColor: mood === i + 1 ? "var(--teal)" : undefined, background: mood === i + 1 ? "var(--soft-teal)" : undefined }}
          >
            <span style={{ fontSize: 24, display: "block" }}>{f}</span>
            <span style={{ fontSize: 11 }}>{l}</span>
          </button>
        ))}
      </div>
      <p style={kick}>Stress, 1 calm to 5 very stressed</p>
      <div className="scale" role="radiogroup" aria-label="Stress">
        {[1, 2, 3, 4, 5].map((v) => (
          <button key={v} role="radio" aria-checked={stress === v} className={stress === v ? "on" : ""} onClick={() => setStress(v)}>
            {v}
          </button>
        ))}
      </div>
      <p style={kick}>Did you get a real break today?</p>
      <div className="moods" style={{ marginTop: 0 }}>
        {[true, false].map((v) => (
          <button key={String(v)} className={`chip ${brk === v ? "on" : ""}`} onClick={() => setBrk(v)}>
            {v ? "Yes" : "Not yet"}
          </button>
        ))}
      </div>
      <input className="field" maxLength={24} placeholder="One word for today (optional)" value={word} onChange={(e) => setWord(e.target.value.replace(/[^\p{L}' -]/gu, ""))} />
      <div className="row" style={{ gap: 8, marginTop: 10 }}>
        <button className="btn p" style={{ flex: 1 }} disabled={busy} onClick={save}>
          {busy ? "Saving…" : c ? "Save changes" : "Check in"}
        </button>
        {editing && (
          <button className="btn o" onClick={() => setEditing(false)}>
            Cancel
          </button>
        )}
      </div>
      <p className="mock" style={{ textAlign: "left", marginTop: 8 }}>Your organization only ever sees unit totals from 5+ people.</p>
    </div>
  );
}
