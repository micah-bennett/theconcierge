import type { Metadata } from "next";
import { requirePageUser } from "@hop/shared/server/session";
import MessagesApp from "@/components/MessagesApp";
import { APP_ROLE } from "@/lib/app";

export const metadata: Metadata = { title: "Messages · Concierge Console · HOP" };

/** /messages[?kind=staff|rep|job&key=…&title=…] opens the inbox, optionally on one thread. */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const me = await requirePageUser(APP_ROLE);
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || "";
  const kind = one(sp.kind);
  const open = ["staff", "rep", "job"].includes(kind) && one(sp.key)
    ? { kind: kind as "staff" | "rep" | "job", key: one(sp.key).slice(0, 80), title: one(sp.title).slice(0, 140) }
    : null;
  return <MessagesApp meId={me.id} open={open} />;
}
