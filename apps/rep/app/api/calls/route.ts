import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { createMaskedSession } from "@hop/shared/server/integrations/twilio";
import { getJob } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

const callSchema = z.object({ jobId: z.string().min(1).max(40), to: z.enum(["client", "vendor"]).default("client") }).strict();

/**
 * POST /api/calls { jobId, to: "client" | "vendor" } -> a masked number for the rep to call or text.
 * Only for the signed-in rep's own job. The phone numbers come from the job on the server, never
 * from the browser. Twilio is a stub: until it's wired, the Rep App uses tel:/sms: links.
 * TODO(IT): wire Twilio Proxy in integrations/twilio.ts and switch the Call/Text buttons to this.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = callSchema.safeParse(await readJson(request));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const job = await getJob(parsed.data.jobId, { repId: user.id });
  if (!job) return json({ error: "Job not found" }, 404);
  const phone = parsed.data.to === "vendor" ? job.vendor?.phone : job.phone;
  if (!phone) return json({ error: "No phone number on this job." }, 400);
  return json(await createMaskedSession(job.id, phone, user.phone));
});
