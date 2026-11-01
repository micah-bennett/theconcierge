"use client";
import { useState } from "react";
import { conciergeSummary } from "@hop/shared/brand";
import { j } from "@hop/shared/client";
import { MessageThread } from "@hop/shared/ui/MessageThread";
import { usePhone } from "@hop/shared/ui/Phone";
import { fmtDate, toTime24 } from "@/lib/dates";
import type { MyConciergeRequest } from "@/lib/types";
import { useConcierge } from "./ConciergeApp";
import { hasAddress } from "./fields";
import { EMPTY_FLIGHT } from "./RequestForm";

/**
 * A request's status pill and one-line status, in HOP Client's words: New, New offer, Accepted,
 * Started, In progress, Completed, Cancelled.
 */
export function statusView(r: MyConciergeRequest): { label: string; cls: string; line: string } {
  const rep = r.repFirst || "Your rep";
  if (r.status === "cancelled") return { label: "Cancelled", cls: "completed", line: "You cancelled this request" };
  switch (r.jobStatus) {
    case "offer":
      return { label: "New offer", cls: "dispatched", line: `Sent to ${rep}, waiting to accept` };
    case "accepted":
      return { label: "Accepted", cls: "dispatched", line: `${rep} has it` };
    case "started":
      return { label: "Started", cls: "en_route", line: `${rep} is on the way` };
    case "in_progress":
      return { label: "In progress", cls: "en_route", line: `${rep} is on it now` };
    case "completed":
      return { label: "Completed", cls: "verified", line: "Done" };
    default:
      if (r.status === "completed") return { label: "Completed", cls: "verified", line: "Done" };
      return { label: "New", cls: "matching", line: r.urgent ? "Urgent · your concierge will call you" : "Received · we're matching you with a rep" };
  }
}

/** True while a rep is working the request (job chat makes sense). */
export const isActive = (r: MyConciergeRequest) => !!r.jobId && (r.jobStatus === "accepted" || r.jobStatus === "started" || r.jobStatus === "in_progress");

/** My requests tab: everything I've asked for, newest first, with live status. */
export function MyRequests() {
  const { requests, go } = useConcierge();
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"open" | "all">("open");

  if (!requests) return <p className="mock">Loading your requests…</p>;
  const done = (r: MyConciergeRequest) => r.status === "cancelled" || r.status === "completed" || r.jobStatus === "completed";
  const shown = filter === "open" ? requests.filter((r) => !done(r)) : requests;

  return (
    <>
      <h1 className="hello disp">My requests</h1>
      <p className="sub">Status updates on their own. Tap a request for details.</p>
      <div className="subtabs" role="tablist">
        {(
          [
            ["open", "Open"],
            ["all", "All"]
          ] as const
        ).map(([k, label]) => (
          <button key={k} role="tab" aria-selected={filter === k} className={filter === k ? "on" : ""} onClick={() => setFilter(k)}>
            {label}
          </button>
        ))}
      </div>
      {!shown.length ? (
        <div className="card">
          <p className="empty">{requests.length ? "Nothing open right now." : "No requests yet."}</p>
          <button className="btn p w" onClick={() => go("request")}>
            Make a request
          </button>
        </div>
      ) : (
        <div className="card">
          {shown.map((r) => (
            <RequestRow key={r.id} r={r} open={open === r.id} onToggle={() => setOpen(open === r.id ? null : r.id)} />
          ))}
        </div>
      )}
    </>
  );
}

function RequestRow({ r, open, onToggle }: { r: MyConciergeRequest; open: boolean; onToggle: () => void }) {
  const { refreshRequests, setDraft, go } = useConcierge();
  const { toast, openSheet } = usePhone();
  const [busy, setBusy] = useState(false);
  const v = statusView(r);
  const d = r.details;
  const when = d ? [fmtDate(d.dateNeeded), d.timeNeeded].filter(Boolean).join(" · ") : r.window || "";
  const canCancel = r.status === "new" && !r.jobId;

  async function cancel() {
    if (!window.confirm("Cancel this request?")) return;
    setBusy(true);
    try {
      await j(`/api/requests?action=cancel&id=${encodeURIComponent(r.id)}`, { method: "POST" });
      toast("Request cancelled.");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Couldn't cancel. Try again.");
    }
    await refreshRequests();
    setBusy(false);
  }

  function again() {
    if (d) {
      setDraft({
        requestType: d.requestType,
        dateNeeded: "",
        time: toTime24(d.timeNeeded),
        text: r.text,
        ...(hasAddress(d.address) ? { address: d.address } : {}),
        flight: d.flight ? { ...d.flight, time: toTime24(d.flight.time) } : EMPTY_FLIGHT,
        // Method and name only: re-enter the last 4 digits if you want them on file.
        payment: { ...d.payment, cardLast4: "" },
        urgent: false
      });
    } else {
      setDraft({ text: r.text });
    }
    go("request");
  }

  return (
    <div className="req">
      <div className="row between" role="button" tabIndex={0} aria-expanded={open} onClick={onToggle} onKeyDown={(e) => e.key === "Enter" && onToggle()} style={{ cursor: "pointer", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <small className="kick">{d?.requestType ?? "Request"}</small>
          <h3 style={{ fontSize: 14, color: "var(--navy)", margin: "2px 0" }}>{r.text}</h3>
          <p style={{ fontSize: 12, color: "var(--muted)" }}>
            {when && `Needed ${when} · `}
            {v.line}
          </p>
        </div>
        <span className={`st ${v.cls}`}>{v.label}</span>
      </div>
      {open && (
        <div style={{ marginTop: 10 }}>
          {r.repFirst && r.status !== "cancelled" && <p style={{ fontSize: 13, marginBottom: 6 }}>Your rep: <b>{r.repFirst}</b></p>}
          {d ? (
            <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "4px 12px", fontSize: 12.5, margin: 0 }}>
              {conciergeSummary(d, { payment: true }).map(([label, value]) => (
                <div key={label} style={{ display: "contents" }}>
                  <dt style={{ color: "var(--muted)", fontWeight: 700 }}>{label}</dt>
                  <dd style={{ margin: 0, color: "var(--ink)" }}>{label === "Payment" ? value.replace(/ — take the full number by phone$/, " · we'll call to complete payment") : value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            r.window && <p style={{ fontSize: 12.5 }}>When: {r.window}</p>
          )}
          <p style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 8 }}>Sent {new Date(r.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
          <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: "wrap" }}>
            {isActive(r) && (
              <button className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => openSheet(<JobChatSheet r={r} />)}>
                Message {r.repFirst || "your rep"}
              </button>
            )}
            <button className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} onClick={again}>
              Request again
            </button>
            {canCancel && (
              <button className="btn o" style={{ padding: "7px 12px", fontSize: 12, color: "var(--coral)" }} disabled={busy} onClick={cancel}>
                {busy ? "Cancelling…" : "Cancel request"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Chat with the rep on an active request (job/<job id>; the server checks it's my request's job). */
export function JobChatSheet({ r }: { r: MyConciergeRequest }) {
  const { profile } = useConcierge();
  const { toast } = usePhone();
  return (
    <div>
      <h2 className="disp" style={{ fontSize: 19, color: "var(--navy)", marginBottom: 4 }}>Message {r.repFirst || "your rep"}</h2>
      <p style={{ fontSize: 13, color: "var(--muted)", marginBottom: 10 }}>{r.text}</p>
      {profile ? (
        <MessageThread kind="job" threadKey={r.jobId!} meId={profile.id} emptyText={`No messages yet. ${r.repFirst || "Your rep"} sees what you write here.`} onError={toast} />
      ) : (
        <p className="mock">Loading…</p>
      )}
      <p className="mock">The HOP team can read this conversation too.</p>
    </div>
  );
}
