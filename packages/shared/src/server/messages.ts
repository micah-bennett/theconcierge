import "server-only";
import type { Message, PortalUser, Role, ThreadKind, ThreadSummary } from "../types";
import { messageSchema } from "../validate";
import { withAuth } from "./auth";
import { json, readJson, sql, zodMessage } from "./db";

/*
 * Message threads (portal_messages):
 *   staff/<staff user id>  a member ↔ the HOP Console team
 *   rep/<rep user id>      a rep ↔ HQ (the Console)
 *   job/<job id>           the job's rep ↔ the member who asked (the Console can read and write)
 * Who may use a thread is decided here from the session user, never from the client.
 */

type Row = {
  id: string | number;
  thread_kind: ThreadKind;
  thread_key: string;
  sender_id: string | null;
  sender_role: Message["senderRole"];
  sender_name: string;
  body: string;
  urgent: boolean;
  at: string | Date;
};

const toMessage = (r: Row): Message => ({
  id: Number(r.id),
  threadKind: r.thread_kind,
  threadKey: r.thread_key,
  senderId: r.sender_id,
  senderRole: r.sender_role,
  senderName: r.sender_name,
  body: r.body,
  urgent: r.urgent,
  at: new Date(r.at).toISOString()
});

/** True if this user may read and post in the thread. */
export async function canUseThread(user: PortalUser, kind: ThreadKind, key: string): Promise<boolean> {
  if (user.role === "console") return true;
  if (kind === "staff") return user.role === "staff" && key === user.id;
  if (kind === "rep") return user.role === "rep" && key === user.id;
  if (kind === "job") {
    if (user.role === "rep") {
      const rows = (await sql()`SELECT 1 FROM portal_jobs WHERE id = ${key} AND rep_id = ${user.id}`) as unknown[];
      return rows.length > 0;
    }
    if (user.role === "staff") {
      const rows = (await sql()`
        SELECT 1 FROM portal_jobs j JOIN portal_requests r ON r.id = j.request_id
        WHERE j.id = ${key} AND r.member_id = ${user.id}
      `) as unknown[];
      return rows.length > 0;
    }
  }
  return false;
}

/** Messages in one thread, oldest first. `after` returns only newer ones (for polling). Caller checks canUseThread. */
export async function listMessages(kind: ThreadKind, key: string, after = 0): Promise<Message[]> {
  const rows = (await sql()`
    SELECT * FROM (
      SELECT id, thread_kind, thread_key, sender_id, sender_role, sender_name, body, urgent, at
      FROM portal_messages WHERE thread_kind = ${kind} AND thread_key = ${key} AND id > ${after}
      ORDER BY id DESC LIMIT 200
    ) m ORDER BY id
  `) as Row[];
  return rows.map(toMessage);
}

/** Posts a message as the user. Caller checks canUseThread. */
export async function postMessage(user: PortalUser, kind: ThreadKind, key: string, body: string, opts: { urgent?: boolean } = {}): Promise<Message> {
  const name = user.role === "console" ? "HOP Concierge" : `${user.firstName} ${user.lastName.slice(0, 1)}.`.trim();
  const rows = (await sql()`
    INSERT INTO portal_messages (thread_kind, thread_key, sender_id, sender_role, sender_name, body, urgent)
    VALUES (${kind}, ${key}, ${user.id}, ${user.role}, ${name}, ${body}, ${!!opts.urgent})
    RETURNING id, thread_kind, thread_key, sender_id, sender_role, sender_name, body, urgent, at
  `) as Row[];
  await markRead(user.id, kind, key);
  return toMessage(rows[0]);
}

export async function markRead(userId: string, kind: ThreadKind, key: string): Promise<void> {
  await sql()`
    INSERT INTO portal_message_reads (user_id, thread_kind, thread_key, read_at) VALUES (${userId}, ${kind}, ${key}, NOW())
    ON CONFLICT (user_id, thread_kind, thread_key) DO UPDATE SET read_at = NOW()
  `;
}

/**
 * Inbox rows for a user: the last message and unread count per thread they can see.
 * Console: every thread. Rep: their HQ thread + their jobs' threads. Staff: their own thread + their jobs' threads.
 */
export async function listThreads(user: PortalUser): Promise<ThreadSummary[]> {
  const rows = (await sql()`
    WITH visible AS (
      SELECT DISTINCT m.thread_kind, m.thread_key FROM portal_messages m
      WHERE ${user.role} = 'console'
         OR (m.thread_kind = 'staff' AND ${user.role} = 'staff' AND m.thread_key = ${user.id}::text)
         OR (m.thread_kind = 'rep' AND ${user.role} = 'rep' AND m.thread_key = ${user.id}::text)
         OR (m.thread_kind = 'job' AND ${user.role} = 'rep'
             AND m.thread_key IN (SELECT id FROM portal_jobs WHERE rep_id = ${user.id}))
         OR (m.thread_kind = 'job' AND ${user.role} = 'staff'
             AND m.thread_key IN (SELECT j.id FROM portal_jobs j JOIN portal_requests r ON r.id = j.request_id WHERE r.member_id = ${user.id}))
    ),
    last AS (
      SELECT DISTINCT ON (m.thread_kind, m.thread_key) m.*
      FROM portal_messages m JOIN visible v USING (thread_kind, thread_key)
      ORDER BY m.thread_kind, m.thread_key, m.id DESC
    )
    SELECT l.id, l.thread_kind, l.thread_key, l.sender_id, l.sender_role, l.sender_name, l.body, l.urgent, l.at,
      (SELECT count(*) FROM portal_messages x
        WHERE x.thread_kind = l.thread_kind AND x.thread_key = l.thread_key
          AND x.sender_id IS DISTINCT FROM ${user.id}
          AND x.at > COALESCE((SELECT read_at FROM portal_message_reads r
                               WHERE r.user_id = ${user.id} AND r.thread_kind = l.thread_kind AND r.thread_key = l.thread_key), 'epoch'))::int AS unread,
      CASE l.thread_kind
        WHEN 'staff' THEN (SELECT first_name || ' ' || last_name FROM portal_users WHERE id::text = l.thread_key)
        WHEN 'rep' THEN (SELECT first_name || ' ' || last_name FROM portal_users WHERE id::text = l.thread_key)
        ELSE (SELECT data->>'title' FROM portal_jobs WHERE id = l.thread_key)
      END AS title
    FROM last l
    ORDER BY l.id DESC
    LIMIT 200
  `) as (Row & { unread: number; title: string | null })[];
  return rows.map((r) => ({
    threadKind: r.thread_kind,
    threadKey: r.thread_key,
    title: r.title ?? "Conversation",
    last: toMessage(r),
    unread: Number(r.unread)
  }));
}

const KINDS: ThreadKind[] = ["staff", "rep", "job"];

/**
 * Route handlers for an app's /api/messages:
 *   GET                         → { threads } (this user's inbox)
 *   GET ?kind=&key=[&after=id]  → { messages } (marks the thread read)
 *   POST ?kind=&key=  {body}    → { message }
 * `onPost` runs after a message is stored (e.g. a push notification hook).
 */
export function createMessageRoutes(role: Role, opts: { onPost?: (m: Message, user: PortalUser) => Promise<void> } = {}) {
  const thread = async (request: Request, user: PortalUser): Promise<{ kind: ThreadKind; key: string }> => {
    const url = new URL(request.url);
    const kind = url.searchParams.get("kind") as ThreadKind;
    const key = (url.searchParams.get("key") || "").slice(0, 80);
    if (!KINDS.includes(kind) || !key) throw json({ error: "Pick a conversation" }, 400);
    if (!(await canUseThread(user, kind, key))) throw json({ error: "Conversation not found" }, 404);
    return { kind, key };
  };
  return {
    GET: withAuth(role, async (request, user) => {
      const url = new URL(request.url);
      if (!url.searchParams.get("kind")) return json({ threads: await listThreads(user) });
      const { kind, key } = await thread(request, user);
      const after = Math.max(0, Number(url.searchParams.get("after")) || 0);
      const messages = await listMessages(kind, key, after);
      if (messages.length || !after) await markRead(user.id, kind, key);
      return json({ messages });
    }),
    POST: withAuth(role, async (request, user) => {
      const { kind, key } = await thread(request, user);
      const parsed = messageSchema.safeParse(await readJson(request));
      if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
      const message = await postMessage(user, kind, key, parsed.data.body);
      await opts.onPost?.(message, user);
      return json({ message }, 201);
    })
  };
}
