import type { Job, StaffRequest } from "@hop/shared/types";

/**
 * The mockup's request lifecycle (concierge view): matching → dispatched → en_route → verified → completed.
 * We derive it from our request status plus its job's status:
 *   new                                   → matching
 *   dispatched + job offer/accepted/passed → dispatched
 *   job started / in_progress             → en_route
 *   job completed with photo or signature → verified (and completed)
 *   job completed with no proof           → completed (verified step stays off)
 *   cancelled                             → cancelled (off the lifecycle)
 */
export type Stage = "matching" | "dispatched" | "en_route" | "verified" | "completed" | "cancelled";

export const STAGES = ["matching", "dispatched", "en_route", "verified", "completed"] as const;

export const STAGE_LABEL: Record<Stage, string> = {
  matching: "Matching",
  dispatched: "Dispatched",
  en_route: "On the way",
  verified: "Verified",
  completed: "Completed",
  cancelled: "Cancelled"
};

/** CSS class for the .st pill (cancelled reuses the grey "completed" style). */
export const stageClass = (s: Stage) => (s === "cancelled" ? "completed" : s);

export const hasProof = (j: Job | undefined | null) => !!j && (j.photos.length > 0 || !!j.sig);

export function requestStage(r: StaffRequest, job: Job | undefined): Stage {
  if (r.status === "cancelled") return "cancelled";
  if (r.status === "new") return "matching";
  if (!job) return r.status === "completed" ? "completed" : "dispatched";
  switch (job.status) {
    case "started":
    case "in_progress":
      return "en_route";
    case "completed":
      return hasProof(job) ? "verified" : "completed";
    default:
      return r.status === "completed" ? "completed" : "dispatched";
  }
}

/** Which of the five lifecycle steps are lit. Verified implies done; completed without proof skips Verified. */
export function stepsOn(stage: Stage): boolean[] {
  if (stage === "cancelled") return STAGES.map(() => false);
  if (stage === "verified") return STAGES.map(() => true);
  const k = STAGES.indexOf(stage);
  return STAGES.map((s, i) => (stage === "completed" ? s !== "verified" : i <= k));
}
