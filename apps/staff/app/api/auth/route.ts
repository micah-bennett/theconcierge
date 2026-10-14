import { createAuthRoutes } from "@hop/shared/server/auth";
import { APP_ROLE } from "@/lib/app";
import { createProfileOnSignup } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

// GET ?action=me|facilities · POST ?action=login|logout|signup|set-password|forgot
// See packages/shared/src/server/auth.ts. ?action=facilities is public (ids and names only).
export const { GET, POST } = createAuthRoutes({
  role: APP_ROLE,
  allowSignup: true,
  // Checks the unit belongs to the facility (400 otherwise; the new user row is rolled back),
  // then writes portal_staff_profiles with the job title, unit and the starter's default prefs.
  onSignup: createProfileOnSignup
});
