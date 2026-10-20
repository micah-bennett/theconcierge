import "server-only";
import { json, sql } from "@hop/shared/server/db";
import { GAME_POINTS } from "../content";
import { dailyBlurb, dailyMatch, dailyQuiz, dailyWords } from "../learn";
import type { PlayState, Played } from "../types";
import { currentPeriods, ensureProfile } from "./profile";

/*
 * Learn & Play. Today's games are picked from lib/learn.ts by the ET date. The client never gets
 * the answers before it has played; the server scores every play, stores it in portal_game_plays
 * (one per game per ET day) and adds the points in the same statement (portal_point_claims,
 * earn key "game:<game>", period = the ET day).
 */

export type GameKey = keyof typeof GAME_POINTS;
export const GAMES = Object.keys(GAME_POINTS) as GameKey[];

const pointsFor = (game: GameKey, score: number, max: number) =>
  game === "match" ? (score === max ? GAME_POINTS.match : 0) : game === "read" ? (score ? GAME_POINTS.read : 0) : score * GAME_POINTS[game];

const norm = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "");

export async function getPlayState(userId: string): Promise<PlayState> {
  const day = currentPeriods().day;
  const rows = (await sql()`SELECT game_key, score, max_score FROM portal_game_plays WHERE user_id = ${userId} AND period = ${day}`) as {
    game_key: string;
    score: number;
    max_score: number;
  }[];
  const played = (g: GameKey): Played | null => {
    const r = rows.find((x) => x.game_key === g);
    return r ? { score: Number(r.score), max: Number(r.max_score), points: pointsFor(g, Number(r.score), Number(r.max_score)) } : null;
  };
  const quiz = dailyQuiz(day);
  const words = dailyWords(day);
  const match = dailyMatch(day);
  const read = dailyBlurb(day);
  const pq = played("quiz");
  const pw = played("words");
  const pm = played("match");
  const pr = played("read");
  return {
    day,
    pointsToday: [pq, pw, pm, pr].reduce((s, p) => s + (p?.points ?? 0), 0),
    quiz: {
      questions: quiz.map((q) => ({ q: q.q, options: q.options })),
      played: pq,
      ...(pq ? { correct: quiz.map((q) => q.a), explain: quiz.map((q) => q.why) } : {})
    },
    words: { scrambles: words.scrambles, played: pw, ...(pw ? { correct: words.words.map((w) => w.word) } : {}) },
    match: { situations: match.situations, services: match.services, played: pm, ...(pm ? { correct: match.correct } : {}) },
    read: { title: read.title, body: read.body, q: read.q, options: read.options, played: pr, ...(pr ? { correct: read.a } : {}) }
  };
}

/** Scores the answers against today's games. Throws 400 on a malformed body. */
function score(game: GameKey, day: string, body: unknown): { score: number; max: number } {
  const b = (body ?? {}) as Record<string, unknown>;
  const bad = () => json({ error: "Those answers don't fit today's game." }, 400);
  const ints = (v: unknown, n: number, max: number) => {
    if (!Array.isArray(v) || v.length !== n || !v.every((x) => Number.isInteger(x) && x >= 0 && x < max)) throw bad();
    return v as number[];
  };
  if (game === "quiz") {
    const qs = dailyQuiz(day);
    const a = ints(b.answers, qs.length, 4);
    return { score: qs.filter((q, i) => q.a === a[i]).length, max: qs.length };
  }
  if (game === "words") {
    const { words } = dailyWords(day);
    const a = b.answers;
    if (!Array.isArray(a) || a.length !== words.length || !a.every((x) => typeof x === "string" && x.length <= 40)) throw bad();
    return { score: words.filter((w, i) => norm(a[i] as string) === w.word).length, max: words.length };
  }
  if (game === "match") {
    const m = dailyMatch(day);
    const a = ints(b.pairs, m.situations.length, m.services.length);
    return { score: m.correct.filter((c, i) => c === a[i]).length, max: m.correct.length };
  }
  const r = dailyBlurb(day);
  if (!Number.isInteger(b.answer) || (b.answer as number) < 0 || (b.answer as number) >= r.options.length) throw bad();
  return { score: b.answer === r.a ? 1 : 0, max: 1 };
}

/**
 * One scored play per game per ET day. The play row, the claim and the balance update are one
 * statement, so a double tap can't pay twice. A replay returns { already: true } and today's state.
 */
export async function play(userId: string, game: GameKey, body: unknown): Promise<{ score: number; max: number; added: number; already: boolean }> {
  await ensureProfile(userId);
  const day = currentPeriods().day;
  const s = score(game, day, body);
  const pts = pointsFor(game, s.score, s.max);
  const rows = (await sql()`
    WITH g AS (
      INSERT INTO portal_game_plays (user_id, game_key, period, score, max_score)
      VALUES (${userId}, ${game}, ${day}, ${s.score}, ${s.max})
      ON CONFLICT DO NOTHING
      RETURNING score
    ), c AS (
      INSERT INTO portal_point_claims (user_id, earn_key, period, points)
      SELECT ${userId}, ${`game:${game}`}, ${day}, ${pts}::int FROM g WHERE ${pts}::int > 0
      ON CONFLICT DO NOTHING
      RETURNING points
    ), u AS (
      UPDATE portal_staff_profiles p
      SET points = p.points + c.points, lifetime_points = p.lifetime_points + c.points, updated_at = NOW()
      FROM c WHERE p.user_id = ${userId}
      RETURNING c.points
    )
    SELECT (SELECT count(*) FROM g)::int AS played, COALESCE((SELECT points FROM u), 0)::int AS added
  `) as { played: number; added: number }[];
  const r = rows[0];
  if (!r?.played) {
    const prev = (await sql()`SELECT score, max_score FROM portal_game_plays WHERE user_id = ${userId} AND game_key = ${game} AND period = ${day}`) as {
      score: number;
      max_score: number;
    }[];
    return { score: Number(prev[0]?.score ?? 0), max: Number(prev[0]?.max_score ?? s.max), added: 0, already: true };
  }
  return { score: s.score, max: s.max, added: Number(r.added), already: false };
}
