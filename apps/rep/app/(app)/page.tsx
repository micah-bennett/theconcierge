import { requirePageUser } from "@hop/shared/server/session";
import { APP_ROLE } from "@/lib/app";
import RepApp from "@/components/RepApp";

/** The Rep App. Who you are comes from the session cookie; there is no rep picker. */
export default async function Home() {
  const user = await requirePageUser(APP_ROLE);
  return <RepApp me={{ first: user.firstName, name: `${user.firstName} ${user.lastName}`.trim(), initials: `${user.firstName[0] ?? ""}${user.lastName[0] ?? ""}`.toUpperCase() }} />;
}
