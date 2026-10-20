import { createMessageRoutes } from "@hop/shared/server/messages";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

// GET → { threads } · GET ?kind=&key=[&after=] → { messages } · POST ?kind=&key= {body} → { message }
// A member may use only staff/<their id> (HOP Concierge) and job/<id> for their own requests' jobs.
export const { GET, POST } = createMessageRoutes(APP_ROLE);
