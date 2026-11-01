import { requirePageUser } from "@hop/shared/server/session";
import { getFacility } from "@hop/shared/server/store";
import { AppHeader } from "@hop/shared/ui/AppHeader";
import { APP_NAME, APP_ROLE } from "@/lib/app";
import FacilityApp from "@/components/FacilityApp";

export const dynamic = "force-dynamic";

export default async function Home() {
  const user = await requirePageUser(APP_ROLE);
  const facility = user.facilityId ? await getFacility(user.facilityId) : null;
  return (
    <>
      <AppHeader
        name={APP_NAME}
        user={`${user.firstName} ${user.lastName}`.trim()}
        right={facility ? <span className="tag n">{facility.name}</span> : undefined}
      />
      {facility ? (
        <FacilityApp facilityName={facility.name} />
      ) : (
        <main className="auth">
          <div className="auth-card">
            <h1 className="disp">{APP_NAME}</h1>
            <p className="auth-sub">Your account isn&apos;t linked to an organization yet. Ask your HOP contact to attach one.</p>
          </div>
        </main>
      )}
    </>
  );
}
