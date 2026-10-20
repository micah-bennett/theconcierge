import { createMessageRoutes } from "@hop/shared/server/messages";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

/**
 * GET → { threads } (my HQ thread rep/<me> + my jobs' threads) · GET ?kind=&key=[&after=] → { messages }
 * POST ?kind=&key= { body } → { message }. Access is checked in packages/shared/src/server/messages.ts.
 */
export const { GET, POST } = createMessageRoutes(APP_ROLE);
