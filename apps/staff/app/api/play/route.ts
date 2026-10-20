import { withAuth } from "@hop/shared/server/auth";
import { json, readJson } from "@hop/shared/server/db";
import { APP_ROLE } from "@/lib/app";
import { GAMES, getPlayState, play, type GameKey } from "@/lib/server/play";

export const dynamic = "force-dynamic";

/** GET → { play: PlayState } today's Learn & Play games (answers only for games already played). */
export const GET = withAuth(APP_ROLE, async (_request, user) => {
  return json({ play: await getPlayState(user.id) });
});

/**
 * POST ?game=quiz   { answers: number[3] }   option index per question
 * POST ?game=words  { answers: string[5] }   the unscrambled words
 * POST ?game=match  { pairs: number[4] }     for each situation, the index of the chosen service
 * POST ?game=read   { answer: number }       option index
 * → { result: { score, max, added, already }, play: PlayState }
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const game = new URL(request.url).searchParams.get("game") as GameKey | null;
  if (!game || !GAMES.includes(game)) return json({ error: "Unknown game" }, 400);
  const result = await play(user.id, game, await readJson(request, 8_000));
  return json({ result, play: await getPlayState(user.id) });
});
