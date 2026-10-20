"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { COMING_SOON, type FeatureKey } from "@/lib/content";
import type { MyReq } from "@/lib/types";
import { useStaff } from "./store";

/** The mockup's icon paths (tabs and top bar). */
export const ic = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plan: '<rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  life: '<path d="M9 11l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="3"/>',
  me: '<path d="M12 21s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 5.5-7 10-7 10z"/>',
  crew: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/><circle cx="17" cy="9" r="2.5"/><path d="M16 14.2c2.8.3 5 2.6 5 5.8"/>',
  chat: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/>'
};

export function Svg({ p, size, style }: { p: string; size?: number; style?: React.CSSProperties }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={style}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dangerouslySetInnerHTML={{ __html: p }}
    />
  );
}

/** Bars for a small chart. A null value draws an empty slot (no check-in that day). */
export function Bars({ arr, max, col }: { arr: [string, number | null][]; max: number; col: string }) {
  return (
    <div className="bars">
      {arr.map(([d, v], i) => (
        <div key={i}>
          <i style={{ height: v ? `${(v / max) * 100}%` : 3, background: v ? col : "var(--line)" }} title={v ? String(v) : "No check-in"} />
          <small>{d}</small>
        </div>
      ))}
    </div>
  );
}

/**
 * An honest placeholder for something that isn't built yet. "Tell me when" writes portal_interest,
 * so HOP can see what members want first.
 */
export function ComingSoon({ feature, icon, text, compact }: { feature: FeatureKey; icon: string; text: string; compact?: boolean }) {
  const { me, act } = useStaff();
  const { toast } = usePhone();
  const [busy, setBusy] = useState(false);
  const asked = me?.interest.includes(feature);
  return (
    <div className="card" style={{ background: "var(--soft-sky)", borderColor: "#cfe3f7" }}>
      <div className="row between" style={{ alignItems: "flex-start" }}>
        <div className="row" style={{ alignItems: "flex-start" }}>
          <div className="ico" style={{ background: "#fff" }}>{icon}</div>
          <div>
            <span className="tag s">Coming soon</span>
            <h3 style={{ marginTop: 6 }}>{COMING_SOON[feature]}</h3>
            {!compact && <p>{text}</p>}
          </div>
        </div>
      </div>
      <button
        className={`btn ${asked ? "o" : "n"} w`}
        style={{ marginTop: 12 }}
        disabled={!me || asked || busy}
        onClick={async () => {
          setBusy(true);
          const r = await act("interest", { feature });
          setBusy(false);
          if (r) toast("Thanks. We'll let you know when it's ready.");
        }}
      >
        {asked ? "We'll let you know ✓" : "Tell me when"}
      </button>
    </div>
  );
}

/**
 * A request's status pill, ETA line and pill colour (the mockup's .st classes), from its job's
 * live status. Uses the brand status words once a job exists.
 */
export function reqView(r: MyReq): { label: string; cls: string; eta: string } {
  const rep = r.repFirst || "Your rep";
  const win = r.jobWindow ? ` · ${r.jobWindow}` : "";
  if (r.status === "cancelled") return { label: "Cancelled", cls: "completed", eta: "Cancelled" };
  if (r.attn && r.jobStatus !== "completed") return { label: "Needs attention", cls: "matching", eta: `${rep} flagged something. HOP will reach out.` };
  switch (r.jobStatus) {
    case "offer":
      return { label: "New offer", cls: "dispatched", eta: `Sent to ${rep}, waiting to accept` };
    case "accepted":
      return { label: "Accepted", cls: "dispatched", eta: `${rep} has it${win}` };
    case "started":
      return { label: "Started", cls: "en_route", eta: `${rep} is on the way${win}` };
    case "in_progress":
      return { label: "In progress", cls: "en_route", eta: `${rep} is on it now` };
    case "completed":
      return { label: "Completed", cls: "verified", eta: r.rating ? `Done · you rated it ${r.rating} of 5` : "Done · tap to rate it" };
    case "declined":
      return { label: "Received", cls: "matching", eta: "Finding another rep" };
    default:
      if (r.status === "completed") return { label: "Completed", cls: "verified", eta: "Done" };
      return { label: "Received", cls: "matching", eta: r.urgent ? "Clutch · your concierge is calling you" : "Matching you with the best rep" };
  }
}

/** True while a rep is working the request (job chat makes sense). */
export const isActive = (r: MyReq) => !!r.jobId && (r.jobStatus === "accepted" || r.jobStatus === "started" || r.jobStatus === "in_progress");
