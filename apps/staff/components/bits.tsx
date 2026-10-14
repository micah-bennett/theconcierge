"use client";
import { nowT } from "@hop/shared/time";
import { CATS } from "@/lib/roles";
import type { MyReq } from "@/lib/types";

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

/** The mockup's readiness ring. */
export function Ring({ v }: { v: number }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg className="rring" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r={r} fill="none" stroke="#e6ebf3" strokeWidth="7" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="#04a6a8" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(c * v) / 100} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontFamily="Montserrat" fontWeight="800" fontSize="16" fill="#012f6c">
        {v}
      </text>
    </svg>
  );
}

export function Bars({ arr, max, col }: { arr: [string, number][]; max: number; col: string }) {
  return (
    <div className="bars">
      {arr.map(([d, v], i) => (
        <div key={i}>
          <i style={{ height: `${(v / max) * 100}%`, background: col }} />
          <small>{d}</small>
        </div>
      ))}
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
      return { label: "Completed", cls: "verified", eta: "Done and verified" };
    case "declined":
      return { label: "Received", cls: "matching", eta: "Finding another rep" };
    default:
      if (r.status === "completed") return { label: "Completed", cls: "verified", eta: "Done" };
      return { label: "Received", cls: "matching", eta: r.urgent ? "Clutch · your concierge is calling you" : "Matching you with the best rep" };
  }
}

/** One row of "Your requests" (mockup reqRow). Tap to see its timeline. */
export function ReqRow({ r, open, onToggle }: { r: MyReq; open: boolean; onToggle: () => void }) {
  const v = reqView(r);
  const steps: [string, string][] = [[nowT(new Date(r.createdAt)), r.urgent ? "Clutch request received" : "Request received"]];
  if (r.window) steps.push(["", `When: ${r.window}`]);
  if (r.jobStatus && !r.updates.length) steps.push(["", `${r.repFirst || "A rep"} assigned`]);
  for (const [t, x] of r.updates) steps.push([t, x.replace(/^Client notified:\s*/, "")]);
  return (
    <div className="req" role="button" tabIndex={0} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()}>
      <div className="row between">
        <div className="row" style={{ minWidth: 0 }}>
          <div className="ico t">{CATS[r.cat]?.[0] ?? "🧾"}</div>
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 14, color: "var(--navy)" }}>{r.text}</h3>
            <p style={{ fontSize: 12 }}>{v.eta}</p>
          </div>
        </div>
        <span className={`st ${v.cls}`}>{v.label}</span>
      </div>
      {open && (
        <div className="tl">
          {steps.map((s, i) => (
            <div key={i}>
              <small>{s[0]}</small>
              {s[1]}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
