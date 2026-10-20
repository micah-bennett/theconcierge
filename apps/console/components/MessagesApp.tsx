"use client";
import { useCallback, useEffect, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import type { ThreadKind } from "@hop/shared/types";
import { MessageThread } from "@hop/shared/ui/MessageThread";
import { useDesktopToast } from "@hop/shared/ui/Phone";
import type { ConsoleThread } from "@/lib/types";

const KIND_LABEL: Record<ThreadKind, string> = { staff: "Member", rep: "Rep", job: "Job chat" };
const KIND_NOTE: Record<ThreadKind, string> = {
  staff: "Only this member and the HOP team see this conversation.",
  rep: "Only this rep and the HOP team see this conversation.",
  job: "The job's rep, the member who asked and the HOP team see this conversation."
};

function when(iso: string) {
  const d = new Date(iso);
  const today = new Date().toDateString() === d.toDateString();
  const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return today ? t : `${d.toLocaleDateString("en-US", { month: "short", day: "numeric" })}, ${t}`;
}

type Open = { kind: ThreadKind; key: string; title: string };

/** The Console inbox: every member, rep and job thread, urgent ones pinned on top. */
export default function MessagesApp({ meId, open }: { meId: string; open: Open | null }) {
  const { toast, node } = useDesktopToast();
  const [threads, setThreads] = useState<ConsoleThread[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState<Open | null>(open);

  const load = useCallback(async () => {
    try {
      const r = await j<{ threads: ConsoleThread[] }>("/api/messages");
      setThreads(r.threads);
      setLoaded(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 5000);
    return () => clearInterval(t);
  }, [load]);

  const isSel = (t: { threadKind: ThreadKind; threadKey: string }) => sel?.kind === t.threadKind && sel.key === t.threadKey;
  const listed = sel ? threads.find(isSel) : undefined;
  const current = sel ? { ...sel, title: listed?.title || sel.title || "New conversation" } : null;

  const pick = (t: ConsoleThread) => {
    setSel({ kind: t.threadKind, key: t.threadKey, title: t.title });
    // Opening a thread marks it read on the server; drop the badge right away.
    setThreads((cur) => cur.map((x) => (x === t ? { ...x, unread: 0 } : x)));
    window.history.replaceState(null, "", `/messages?kind=${t.threadKind}&key=${encodeURIComponent(t.threadKey)}`);
  };

  const unread = threads.reduce((n, t) => n + t.unread, 0);

  return (
    <section className="console on">
      {node}
      <div className="chead">
        <div>
          <span className="tag n">Messages</span>
          <h1 className="disp" style={{ marginTop: 10 }}>Conversations with members and reps</h1>
          <p>Member threads, rep check-ins and job chats in one place. Urgent alerts stay on top until someone on the team replies.</p>
        </div>
      </div>

      <div className="cgrid">
        <div className="panel">
          <div className="row between">
            <h2>Inbox</h2>
            <span className={`tag ${unread ? "c" : "g"}`}>{unread ? `${unread} unread` : "All read"}</span>
          </div>
          <div style={{ marginTop: 10 }}>
            {sel && !listed && (
              <div className="netrow" style={{ background: "var(--soft-sky)", borderRadius: 12, padding: "11px 12px" }}>
                <div className="grow">
                  <b>{current?.title}</b>
                  <small>{KIND_LABEL[sel.kind]} · No messages yet</small>
                </div>
              </div>
            )}
            {threads.map((t) => (
              <button
                key={`${t.threadKind}/${t.threadKey}`}
                className="netrow"
                onClick={() => pick(t)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "11px 12px",
                  borderRadius: 12,
                  background: isSel(t) ? "var(--soft-sky)" : t.urgent ? "#fbe5e3" : "transparent",
                  borderLeft: t.urgent ? "4px solid var(--coral)" : "4px solid transparent"
                }}
              >
                <div className="grow" style={{ minWidth: 0 }}>
                  <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                    <b style={{ display: "inline" }}>{t.title}</b>
                    <span className={`tag ${t.threadKind === "rep" ? "s" : t.threadKind === "job" ? "n" : ""}`}>{KIND_LABEL[t.threadKind]}</span>
                    {t.urgent && <span className="tag c">Urgent</span>}
                  </div>
                  <small style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {t.last.senderId === meId ? "You: " : t.last.senderName ? `${t.last.senderName}: ` : ""}
                    {t.last.body}
                  </small>
                </div>
                <div style={{ textAlign: "right", flex: "0 0 auto" }}>
                  <small style={{ display: "block" }}>{when(t.last.at)}</small>
                  {t.unread > 0 && <span className={`tag ${t.urgent ? "c" : ""}`} style={{ marginTop: 4 }}>{t.unread}</span>}
                </div>
              </button>
            ))}
            {!threads.length && !sel && <p className="empty">{loaded ? "No conversations yet. Members and reps can message the team from their apps." : "Loading..."}</p>}
          </div>
        </div>

        <div className="panel">
          {current ? (
            <>
              <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
                <span className="tag n">{KIND_LABEL[current.kind]}</span>
                {listed?.urgent && <span className="tag c">Urgent · waiting for a reply</span>}
              </div>
              <h2 style={{ marginTop: 10 }}>{current.title}</h2>
              <p className="ps">{KIND_NOTE[current.kind]}</p>
              <MessageThread
                key={`${current.kind}/${current.key}`}
                kind={current.kind}
                threadKey={current.key}
                meId={meId}
                maxHeight={460}
                emptyText="No messages yet. Start the conversation."
                placeholder="Reply as HOP Concierge"
                onError={toast}
              />
            </>
          ) : (
            <>
              <h2>Conversation</h2>
              <p className="ps">Pick a conversation from the inbox.</p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
