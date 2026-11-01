import { requirePageUser } from "@hop/shared/server/session";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

/** Everything inside (app)/ requires a signed-in user with this app's role. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requirePageUser(APP_ROLE);
  return <>{children}</>;
}
