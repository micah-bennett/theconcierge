import { createAuthRoutes } from "@hop/shared/server/auth";
import { APP_ROLE } from "@/lib/app";
import { createProfileOnSignup } from "@/lib/server/profile";

export const dynamic = "force-dynamic";

// GET ?action=me · POST ?action=login|logout|signup|set-password|forgot
// See packages/shared/src/server/auth.ts. Sign-up here creates a "customer" with no facility, so
// nothing a concierge customer does can ever reach Facility View. The sign-up form then saves the
// optional address and "How did you hear about us?" with PUT /api/me (already signed in by then).
export const { GET, POST } = createAuthRoutes({
  role: APP_ROLE,
  allowCustomerSignup: true,
  onCustomerSignup: createProfileOnSignup
});
