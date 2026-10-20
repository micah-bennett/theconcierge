import { requirePageUser } from "@hop/shared/server/session";
import ConsoleHeader from "@/components/ConsoleHeader";
import { APP_NAME, APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

/** Everything inside (app)/ requires a signed-in console user. */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requirePageUser(APP_ROLE);
  return (
    <>
      <ConsoleHeader name={APP_NAME} user={`${user.firstName} ${user.lastName}`} />
      {children}
    </>
  );
}
