import { requirePageUser } from "@hop/shared/server/session";
import { AppHeader } from "@hop/shared/ui/AppHeader";
import { APP_NAME, APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

const NAV = [
  { href: "/", label: "Console" },
  { href: "/team", label: "Team" }
];

/** Everything inside (app)/ requires a signed-in console user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(APP_ROLE);
  return (
    <>
      <AppHeader name={APP_NAME} nav={NAV} user={`${user.firstName} ${user.lastName}`} />
      {children}
    </>
  );
}
