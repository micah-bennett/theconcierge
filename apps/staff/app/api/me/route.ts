import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import type { PortalUser } from "@hop/shared/types";
import { APP_ROLE } from "@/lib/app";
import { COMING_SOON, PULSE_WORDS, REWARDS, SOCIAL_NETWORKS } from "@/lib/content";
import {
  addInterest,
  addLifeItem,
  answerDoor,
  claimSocial,
  deleteLifeItem,
  getMeState,
  rateRequest,
  redeem,
  saveCheckin,
  savePulse,
  saveShift,
  setLifeDone,
  setReferredBy
} from "@/lib/server/me";

export const dynamic = "force-dynamic";

const clean = (max: number) => z.string().trim().max(max).transform((s) => s.replace(/[<>`]/g, ""));
const word = z
  .string()
  .trim()
  .max(24)
  .regex(/^[\p{L}' -]*$/u, "One word, letters only")
  .default("");
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Use a time like 07:00");

const schemas = {
  checkin: z.object({ mood: z.number().int().min(1).max(5), stress: z.number().int().min(1).max(5), tookBreak: z.boolean(), word }).strict(),
  pulse: z
    .object({
      supported: z.number().int().min(1).max(5),
      word: z.union([z.enum(PULSE_WORDS as [string, ...string[]]), word]).default("")
    })
    .strict(),
  shift: z
    .object({
      shift: z
        .object({
          days: z.array(z.number().int().min(0).max(6)).max(7).transform((d) => [...new Set(d)].sort()),
          start: time,
          end: time,
          night: z.boolean()
        })
        .strict()
        .nullable()
    })
    .strict(),
  "life-add": z
    .object({
      title: clean(120).pipe(z.string().min(1, "Add a title")),
      dueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional()
    })
    .strict(),
  "life-done": z.object({ id: z.number().int().positive(), done: z.boolean() }).strict(),
  "life-delete": z.object({ id: z.number().int().positive() }).strict(),
  interest: z.object({ feature: z.enum(Object.keys(COMING_SOON) as [string, ...string[]]) }).strict(),
  redeem: z.object({ rewardKey: z.enum(REWARDS.map((r) => r.key) as [string, ...string[]]) }).strict(),
  rate: z.object({ requestId: z.string().min(1).max(40), stars: z.number().int().min(1).max(5), note: clean(500).default("") }).strict(),
  door: z.object({ jobId: z.string().min(1).max(40), approve: z.boolean() }).strict(),
  referred: z.object({ code: z.string().trim().regex(/^[A-Za-z0-9]{8}$/, "Invalid code") }).strict(),
  social: z
    .object({ kind: z.enum(["follow", "blog", "share"]), network: z.enum(SOCIAL_NETWORKS).optional() })
    .strict()
};

type Schemas = typeof schemas;
type Action = keyof Schemas;
type Handlers = { [A in Action]: (user: PortalUser, body: z.infer<Schemas[A]>) => Promise<object | void> };

const handlers: Handlers = {
  checkin: async (user, b) => ({ added: (await saveCheckin(user.id, b)).added }),
  pulse: (user, b) => savePulse(user.id, b),
  shift: (user, b) => saveShift(user.id, b.shift),
  "life-add": (user, b) => addLifeItem(user.id, b.title, b.dueOn ?? null),
  "life-done": (user, b) => setLifeDone(user.id, b.id, b.done),
  "life-delete": (user, b) => deleteLifeItem(user.id, b.id),
  interest: (user, b) => addInterest(user.id, b.feature),
  redeem: (user, b) => redeem(user, b.rewardKey),
  rate: (user, b) => rateRequest(user.id, b.requestId, b.stars, b.note),
  door: (user, b) => answerDoor(user, b.jobId, b.approve),
  referred: (user, b) => setReferredBy(user, b.code),
  social: (user, b) => claimSocial(user.id, b.kind, b.network)
};

async function run<A extends Action>(action: A, user: PortalUser, body: unknown): Promise<Response | object> {
  const parsed = schemas[action].safeParse(body);
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  return (await handlers[action](user, parsed.data as z.infer<Schemas[A]>)) || {};
}

/** GET → MeState (lib/types.ts): check-ins, streak, pulse, shift, life, rewards, referral, social, leaderboard. */
export const GET = withAuth(APP_ROLE, async (_request, user) => {
  return json({ me: await getMeState(user) });
});

/**
 * POST ?action=<name>, body per `schemas` above. Every action returns { me } (the fresh MeState)
 * plus its own fields: `added` (points just earned) for checkin, pulse, rate and social;
 * { redemptionId, requestId, points } for redeem; { doorState } for door; { ok } for referred.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const action = new URL(request.url).searchParams.get("action");
  if (!action || !Object.hasOwn(schemas, action)) return json({ error: "Unknown action" }, 400);
  const extra = await run(action as Action, user, await readJson(request));
  if (extra instanceof Response) return extra;
  return json({ me: await getMeState(user), ...extra });
});
