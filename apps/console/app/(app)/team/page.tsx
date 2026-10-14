import type { Metadata } from "next";
import { requirePageUser } from "@hop/shared/server/session";
import TeamApp from "@/components/TeamApp";
import { APP_ROLE } from "@/lib/app";

export const metadata: Metadata = { title: "Team · Concierge Console · HOP" };

export default async function TeamPage() {
  const me = await requirePageUser(APP_ROLE);
  return <TeamApp meId={me.id} />;
}
