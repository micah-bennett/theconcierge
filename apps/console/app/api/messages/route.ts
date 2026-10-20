import { withAuth } from "@hop/shared/server/auth";
import { json } from "@hop/shared/server/db";
import { createMessageRoutes, listThreads } from "@hop/shared/server/messages";
import { APP_ROLE } from "@/lib/app";
import { urgentThreadKeys } from "@/lib/server/queries";
import type { ConsoleThread } from "@/lib/types";

export const dynamic = "force-dynamic";

const routes = createMessageRoutes(APP_ROLE);

/**
 * GET  /api/messages                     → { threads: ConsoleThread[] } every thread; urgent ones
 *                                          (an urgent message newer than the team's last reply) first
 * GET  /api/messages?kind=&key=[&after=] → { messages } (shared handler; marks the thread read)
 * POST /api/messages?kind=&key= {body}   → { message } (shared handler)
 */
export const GET = withAuth<unknown>(APP_ROLE, async (request, user, ctx) => {
  if (new URL(request.url).searchParams.get("kind")) return routes.GET(request, ctx);
  const [threads, urgent] = await Promise.all([listThreads(user), urgentThreadKeys()]);
  const rows: ConsoleThread[] = threads.map((t) => ({ ...t, urgent: urgent.has(`${t.threadKind}/${t.threadKey}`) }));
  rows.sort((a, b) => Number(b.urgent) - Number(a.urgent) || b.last.id - a.last.id);
  return json({ threads: rows });
});

export const POST = routes.POST;
