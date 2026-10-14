import { STATUS_LABEL } from "../brand";
import type { JobStatus } from "../types";

const STEPS: JobStatus[] = ["accepted", "started", "in_progress", "completed"];

export function StatusSteps({ status }: { status: JobStatus }) {
  const k = STEPS.indexOf(status);
  return (
    <div className="stepper">
      {STEPS.map((s, i) => (
        <div key={s} className={i <= k ? "on" : ""}>
          <i />
          <small>{STATUS_LABEL[s]}</small>
        </div>
      ))}
    </div>
  );
}

export function statusPill(j: { status: JobStatus; attn: unknown }) {
  if (j.attn) return ["Needs attention", "matching"] as const;
  return (
    {
      offer: ["New offer", "dispatched"],
      accepted: ["Accepted", "dispatched"],
      started: ["Started", "en_route"],
      in_progress: ["In progress", "en_route"],
      completed: ["Completed", "verified"],
      declined: ["Passed · reassign", "matching"]
    } as const
  )[j.status];
}
