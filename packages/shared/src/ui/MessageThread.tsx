"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, messagesApi } from "../client";
import type { Message, ThreadKind } from "../types";

/**
 * A live conversation (polls every 4 s). Uses the app's own /api/messages, which decides who may
 * read the thread. `emptyText` shows before the first message.
 */
export function MessageThread({
  kind,
  threadKey,
  meId,
  emptyText = "No messages yet. Say hello.",
  placeholder = "Write a message",
  maxHeight = 340,
  onError
}: {
  kind: ThreadKind;
  threadKey: string;
  meId: string;
  emptyText?: string;
  placeholder?: string;
  maxHeight?: number;
  onError?: (m: string) => void;
}) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);

  const pull = useCallback(async () => {
    try {
      const { messages } = await messagesApi.list(kind, threadKey, lastId.current);
      if (messages.length) {
        lastId.current = messages[messages.length - 1].id;
        setMsgs((cur) => [...cur, ...messages.filter((m) => !cur.some((c) => c.id === m.id))]);
      }
      setLoaded(true);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }, [kind, threadKey]);

  useEffect(() => {
    lastId.current = 0;
    setMsgs([]);
    setLoaded(false);
    pull();
    const t = setInterval(pull, 4000);
    return () => clearInterval(t);
  }, [pull]);

  useEffect(() => {
    box.current?.scrollTo({ top: box.current.scrollHeight });
  }, [msgs.length]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    try {
      const { message } = await messagesApi.post(kind, threadKey, body);
      setText("");
      lastId.current = Math.max(lastId.current, message.id);
      setMsgs((cur) => (cur.some((c) => c.id === message.id) ? cur : [...cur, message]));
    } catch (e) {
      onError?.(e instanceof Error ? e.message : "Couldn't send. Try again.");
    } finally {
      setSending(false);
    }
  };

  const time = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div>
      <div className="chat" ref={box} style={{ maxHeight }}>
        {loaded && !msgs.length && <p className="empty">{emptyText}</p>}
        {msgs.map((m) => {
          const mine = m.senderId === meId;
          return (
            <div key={m.id} className={`bub ${mine ? "me" : "ai"}`} style={m.urgent ? { borderColor: "var(--coral)" } : undefined}>
              {!mine && <b style={{ display: "block", fontSize: 11.5, marginBottom: 2 }}>{m.senderName}</b>}
              {m.body}
              <small style={{ display: "block", fontSize: 10.5, opacity: 0.65, marginTop: 3 }}>{time(m.at)}</small>
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          className="field"
          value={text}
          maxLength={1000}
          placeholder={placeholder}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          aria-label={placeholder}
        />
        <button className="btn p" style={{ flex: "0 0 auto", width: "auto", padding: "0 18px" }} disabled={sending || !text.trim()} onClick={send}>
          Send
        </button>
      </div>
    </div>
  );
}
