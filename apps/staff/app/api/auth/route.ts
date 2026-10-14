import { createAuthRoutes } from "@hop/shared/server/auth";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

// GET ?action=me · POST ?action=login|logout|set-password|forgot — see packages/shared/src/server/auth.ts
export const { GET, POST } = createAuthRoutes({
  role: APP_ROLE
  // Phase 4: allowSignup + onSignup (writes portal_staff_profiles).
});
