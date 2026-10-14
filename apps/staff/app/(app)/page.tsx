import { requirePageUser } from "@hop/shared/server/session";
import { APP_NAME, APP_ROLE } from "@/lib/app";
import { SignOutButton } from "@hop/shared/ui/AppHeader";

// Placeholder until this app's phase is built (docs/rebuild/).
export default async function Home() {
  const user = await requirePageUser(APP_ROLE);
  return (
    <main className="auth">
      <div className="auth-card">
        <h1 className="disp">{APP_NAME}</h1>
        <p className="auth-sub">Signed in as {user.firstName} {user.lastName}. This app is being built.</p>
        <SignOutButton />
      </div>
    </main>
  );
}
