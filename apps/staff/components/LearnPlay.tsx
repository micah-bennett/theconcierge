"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import { usePhone } from "@hop/shared/ui/Phone";
import { GAME_POINTS } from "@/lib/content";
import type { PlayState, Played } from "@/lib/types";
import { useStaff } from "./store";

type Result = { score: number; max: number; added: number; already: boolean };

/**
 * Learn & Play: four short daily games about HOP. Today's questions come from GET /api/play
 * without answers; POST /api/play?game=… scores them on the server and adds the points once a day.
 */
export function LearnPlay() {
  const { refreshProfile } = useStaff();
  const { toast } = usePhone();
  const [play, setPlay] = useState<PlayState | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    j<{ play: PlayState }>("/api/play")
      .then((r) => setPlay(r.play))
      .catch((e) => {
        if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
        else toast("Couldn't load today's games. Try again in a moment.");
      });
  }, [toast]);

  const submit = useCallback(
    async (game: string, body: unknown) => {
      setBusy(game);
      try {
        const r = await j<{ result: Result; play: PlayState }>(`/api/play?game=${game}`, { method: "POST", body: JSON.stringify(body) });
        setPlay(r.play);
        refreshProfile();
        toast(r.result.already ? "You already played this one today." : `${r.result.score} of ${r.result.max} right${r.result.added ? `. +${r.result.added} points.` : "."}`);
      } catch (e) {
        toast(e instanceof Error ? e.message : "Couldn't send. Try again.");
      }
      setBusy(null);
    },
    [refreshProfile, toast]
  );

  if (!play) return <p className="mock">Loading today&apos;s games…</p>;
  const done = [play.quiz, play.words, play.match, play.read].filter((g) => g.played).length;

  return (
    <>
      <div className="points" style={{ background: "linear-gradient(135deg,var(--teal),#028a8c)" }}>
        <small style={{ fontWeight: 700, fontSize: 11, letterSpacing: ".08em", textTransform: "uppercase", opacity: 0.85 }}>Learn &amp; Play today</small>
        <div className="num" style={{ fontSize: 28 }}>{done} of 4 played</div>
        <p style={{ fontSize: 13, opacity: 0.9 }}>+{play.pointsToday} points today. New games every day at midnight Eastern.</p>
      </div>
      <Read play={play} busy={busy === "read"} submit={submit} />
      <Quiz play={play} busy={busy === "quiz"} submit={submit} />
      <Words play={play} busy={busy === "words"} submit={submit} />
      <Match play={play} busy={busy === "match"} submit={submit} />
    </>
  );
}

type GameProps = { play: PlayState; busy: boolean; submit: (game: string, body: unknown) => Promise<void> };

function Head({ icon, title, sub, played }: { icon: string; title: string; sub: string; played: Played | null }) {
  return (
    <div className="row between" style={{ marginBottom: 8 }}>
      <div className="row">
        <div className="ico g">{icon}</div>
        <div>
          <h3>{title}</h3>
          <p style={{ fontSize: 12 }}>{sub}</p>
        </div>
      </div>
      {played && (
        <span className="tag">
          {played.score}/{played.max} · +{played.points}
        </span>
      )}
    </div>
  );
}

function Options({ options, picked, correct, onPick }: { options: string[]; picked: number | undefined; correct?: number; onPick: (i: number) => void }) {
  return (
    <div className="moods" style={{ marginTop: 6 }}>
      {options.map((o, i) => {
        const on = picked === i;
        const style =
          correct === undefined ? undefined : i === correct ? { background: "#e2f4e8", borderColor: "#23824a", color: "#23824a" } : on ? { background: "#fbe5e3", borderColor: "var(--coral)", color: "#b23e36" } : undefined;
        return (
          <button key={i} className={`chip ${on && correct === undefined ? "on" : ""}`} style={style} disabled={correct !== undefined} onClick={() => onPick(i)}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function Read({ play, busy, submit }: GameProps) {
  const r = play.read;
  const [pick, setPick] = useState<number | undefined>();
  return (
    <div className="card">
      <Head icon="💡" title="Did you know?" sub={`+${GAME_POINTS.read} pts for the right answer`} played={r.played} />
      <b style={{ fontSize: 14, color: "var(--navy)" }}>{r.title}</b>
      <p style={{ marginTop: 4, color: "var(--ink)" }}>{r.body}</p>
      <p style={{ marginTop: 10, fontWeight: 700, color: "var(--navy)", fontSize: 13.5 }}>{r.q}</p>
      <Options options={r.options} picked={pick} correct={r.correct} onPick={setPick} />
      {!r.played && (
        <button className="btn p w" disabled={pick === undefined || busy} onClick={() => submit("read", { answer: pick })}>
          {busy ? "Checking…" : "Check my answer"}
        </button>
      )}
    </div>
  );
}

function Quiz({ play, busy, submit }: GameProps) {
  const q = play.quiz;
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const ready = q.questions.every((_, i) => answers[i] !== undefined);
  return (
    <div className="card">
      <Head icon="❓" title="Daily HOP Quiz" sub={`3 questions · +${GAME_POINTS.quiz} pts each`} played={q.played} />
      {q.questions.map((x, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <p style={{ fontWeight: 700, color: "var(--navy)", fontSize: 13.5 }}>
            {i + 1}. {x.q}
          </p>
          <Options options={x.options} picked={answers[i]} correct={q.correct?.[i]} onPick={(k) => setAnswers((a) => ({ ...a, [i]: k }))} />
          {q.explain && <p style={{ fontSize: 12 }}>{q.explain[i]}</p>}
        </div>
      ))}
      {!q.played && (
        <button className="btn p w" style={{ marginTop: 8 }} disabled={!ready || busy} onClick={() => submit("quiz", { answers: q.questions.map((_, i) => answers[i]) })}>
          {busy ? "Checking…" : "Check my answers"}
        </button>
      )}
    </div>
  );
}

function Words({ play, busy, submit }: GameProps) {
  const w = play.words;
  const [answers, setAnswers] = useState<string[]>(() => w.scrambles.map(() => ""));
  return (
    <div className="card">
      <Head icon="🔤" title="Word scramble" sub={`Unscramble 5 HOP words · +${GAME_POINTS.words} pts each`} played={w.played} />
      {w.scrambles.map((s, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <div className="row between">
            <b style={{ fontFamily: "Montserrat", letterSpacing: ".18em", color: "var(--navy)" }}>{s.letters}</b>
            {w.correct && <span className={`tag ${answers[i].toUpperCase().replace(/[^A-Z]/g, "") === w.correct[i] ? "" : "g"}`}>{w.correct[i]}</span>}
          </div>
          <small style={{ fontSize: 12, color: "var(--muted)" }}>{s.hint}</small>
          {!w.played && (
            <input
              className="field"
              style={{ marginTop: 6, textTransform: "uppercase" }}
              maxLength={20}
              aria-label={`Unscramble ${s.letters}`}
              value={answers[i]}
              onChange={(e) => setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x)))}
            />
          )}
        </div>
      ))}
      {!w.played && (
        <button className="btn p w" style={{ marginTop: 10 }} disabled={busy || answers.every((a) => !a.trim())} onClick={() => submit("words", { answers })}>
          {busy ? "Checking…" : "Check my words"}
        </button>
      )}
    </div>
  );
}

function Match({ play, busy, submit }: GameProps) {
  const m = play.match;
  const [pairs, setPairs] = useState<Record<number, number>>({});
  const ready = m.situations.every((_, i) => pairs[i] !== undefined);
  return (
    <div className="card">
      <Head icon="🧩" title="Match it" sub={`Pick the HOP service for each moment · +${GAME_POINTS.match} pts for all 4`} played={m.played} />
      {m.situations.map((s, i) => (
        <div key={i} style={{ marginTop: 10 }}>
          <p style={{ fontSize: 13.5, color: "var(--ink)" }}>{s}</p>
          {m.correct ? (
            <span className="tag">{m.services[m.correct[i]]}</span>
          ) : (
            <select className="field" style={{ marginTop: 6 }} aria-label={`Service for: ${s}`} value={pairs[i] ?? ""} onChange={(e) => setPairs((p) => ({ ...p, [i]: Number(e.target.value) }))}>
              <option value="" disabled>
                Choose a service
              </option>
              {m.services.map((x, k) => (
                <option key={k} value={k}>
                  {x}
                </option>
              ))}
            </select>
          )}
        </div>
      ))}
      {!m.played && (
        <button className="btn p w" style={{ marginTop: 10 }} disabled={!ready || busy} onClick={() => submit("match", { pairs: m.situations.map((_, i) => pairs[i]) })}>
          {busy ? "Checking…" : "Check my matches"}
        </button>
      )}
    </div>
  );
}
