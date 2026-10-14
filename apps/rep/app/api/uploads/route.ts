import { z } from "zod";
import { withAuth } from "@hop/shared/server/auth";
import { json, readJson, zodMessage } from "@hop/shared/server/db";
import { getJob } from "@hop/shared/server/store";
import { APP_ROLE } from "@/lib/app";

export const dynamic = "force-dynamic";

const MAX_IMAGE_BYTES = 2_000_000; // 2 MB decoded

const uploadSchema = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Send a PNG, JPEG, or WEBP image"),
  kind: z.enum(["photo", "signature"]),
  jobId: z.string().min(1).max(40)
});

/**
 * POST /api/uploads { dataUrl, kind: "photo" | "signature", jobId } -> { url }
 * The job must be the signed-in rep's (404 otherwise) and not yet completed.
 * With BLOB_READ_WRITE_TOKEN set, stores the image in Vercel Blob and returns its URL.
 * Without it (demo), returns the data URL unchanged, so it's saved inline on the job.
 * TODO(IT): make proofs private (signed URLs) before real deliveries.
 */
export const POST = withAuth(APP_ROLE, async (request, user) => {
  const parsed = uploadSchema.safeParse(await readJson(request, 2_900_000));
  if (!parsed.success) return json({ error: zodMessage(parsed.error) }, 400);
  const { dataUrl, kind, jobId } = parsed.data;

  const job = await getJob(jobId, { repId: user.id });
  if (!job) return json({ error: "Job not found" }, 404);
  if (job.status === "completed" || job.status === "declined" || job.status === "offer") {
    return json({ error: "This job isn't taking proof right now." }, 409);
  }

  const [meta, b64] = dataUrl.split(",");
  const bytes = Buffer.from(b64, "base64");
  if (bytes.length > MAX_IMAGE_BYTES) return json({ error: "Image is over 2 MB. Try again." }, 413);

  if (!process.env.BLOB_READ_WRITE_TOKEN) return json({ url: dataUrl, demo: true });
  const type = meta.slice(5, meta.indexOf(";"));
  const ext = type.split("/")[1] === "jpeg" ? "jpg" : type.split("/")[1];
  const { put } = await import("@vercel/blob");
  const blob = await put(`proofs/${jobId}/${kind}-${Date.now()}.${ext}`, bytes, {
    access: "public", // TODO(IT): private store + signed URLs.
    contentType: type,
    addRandomSuffix: true
  });
  return json({ url: blob.url });
});
