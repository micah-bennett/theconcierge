import "server-only";
import type { Job } from "@hop/shared/types";
import { REP_STATUS_MOVES } from "@hop/shared/validate";

/*
 * Rep-side job rules on top of repPatchJobSchema (which already blocks `rep`, the request fields,
 * and anything unknown). See "Who may change what on a job" in docs/portal/architecture.md.
 */

/** Photo / signature values must be an inline image or a file in our Vercel Blob store. */
const BLOB_URL = /^https:\/\/[a-z0-9-]+\.(public\.)?blob\.vercel-storage\.com\//i;
const okImage = (v: string) => v.startsWith("data:image/") || BLOB_URL.test(v);

/** Returns an error message (400) for a patch this rep may not make, or null if it's fine. */
export function checkRepPatch(before: Job, patch: Partial<Job>): string | null {
  if (before.status === "declined") return "You passed on this job. Ask dispatch to send it again.";

  if (patch.status && patch.status !== before.status) {
    const allowed = REP_STATUS_MOVES[before.status] ?? [];
    if (!allowed.includes(patch.status)) return `A job that is ${before.status.replace("_", " ")} can't move to ${patch.status.replace("_", " ")}.`;
  }

  const proofTouched = patch.photos !== undefined || patch.sig !== undefined || patch.signedBy !== undefined;
  if (proofTouched && before.status === "completed") return "Proof is locked once the job is completed.";
  if (proofTouched && before.status === "offer") return "Accept the job before adding proof.";

  for (const p of patch.photos ?? []) if (!okImage(p)) return "photos: Upload photos through the app.";
  if (patch.sig && !okImage(patch.sig)) return "sig: Upload the signature through the app.";

  if (patch.status === "completed" && before.status !== "completed") {
    const after = { ...before, ...patch };
    if (after.needPhoto && !after.photos.length) return "Add a completion photo first.";
    if (after.needSig && !after.sig) return "Get a delivery signature first.";
  }
  return null;
}

/** Statuses where the job is live in the field (door access, calls). */
export const ACTIVE_STATUSES: Job["status"][] = ["accepted", "started", "in_progress"];
