"use client";
import { MessageThread } from "@hop/shared/ui/MessageThread";
import { usePhone } from "@hop/shared/ui/Phone";
import { useConcierge } from "./ConciergeApp";
import { JobChatSheet, isActive } from "./MyRequests";

/** Messages tab: my own line to HOP Concierge (staff/<my id>), plus a chat with the rep on each active request. */
export function Messages() {
  const { profile, requests } = useConcierge();
  const { toast, openSheet } = usePhone();
  const active = (requests || []).filter(isActive);
  return (
    <>
      <h1 className="hello disp">Messages</h1>
      <p className="sub">Questions, changes, anything at all. Your concierge team replies here.</p>
      {active.length > 0 && (
        <>
          <div className="sect">
            <h2>Your rep</h2>
          </div>
          <div className="card list">
            {active.map((r) => (
              <button key={r.id} className="it" style={{ width: "100%", textAlign: "left" }} onClick={() => openSheet(<JobChatSheet r={r} />)}>
                <div className="grow">
                  <b>Message {r.repFirst || "your rep"}</b>
                  <small>{r.text}</small>
                </div>
                <span style={{ fontSize: 20, color: "var(--muted)" }}>›</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="sect">
        <h2>HOP Concierge</h2>
      </div>
      <div className="card">
        {profile ? (
          <MessageThread kind="staff" threadKey={profile.id} meId={profile.id} maxHeight={420} emptyText="No messages yet. Say hello, or ask us anything." onError={toast} />
        ) : (
          <p className="mock">Loading…</p>
        )}
      </div>
    </>
  );
}
