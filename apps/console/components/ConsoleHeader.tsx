"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import type { ConsoleThread } from "@/lib/types";

/*
 * The Console's top bar: the shared AppHeader's markup, plus a live unread badge on the Messages tab
 * (polled every 10 s; coral when an urgent thread is waiting). Local because the shared AppHeader's
 * nav labels are plain strings.
 */

const NAV = [
  { href: "/", label: "Console" },
  { href: "/messages", label: "Messages" },
  { href: "/team", label: "Team" }
];

export function useUnread(interval = 10000) {
  const [state, setState] = useState({ unread: 0, urgent: 0 });
  useEffect(() => {
    let live = true;
    const pull = async () => {
      try {
        const { threads } = await j<{ threads: ConsoleThread[] }>("/api/messages");
        if (live) setState({ unread: threads.reduce((n, t) => n + t.unread, 0), urgent: threads.filter((t) => t.urgent).length });
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      }
    };
    pull();
    const t = setInterval(pull, interval);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, [interval]);
  return state;
}

export default function ConsoleHeader({ name, user }: { name: string; user: string }) {
  const path = usePathname();
  const { unread, urgent } = useUnread();
  return (
    <header className="viewbar">
      <Link href="/" className="brand" style={{ textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" />
        <span className="appname">{name}</span>
      </Link>
      <nav className="seg" aria-label="Sections">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>
            {n.label}
            {n.href === "/messages" && unread > 0 && (
              <span
                aria-label={`${unread} unread`}
                style={{
                  marginLeft: 6,
                  display: "inline-block",
                  minWidth: 18,
                  padding: "1px 6px",
                  borderRadius: 99,
                  fontSize: 11,
                  lineHeight: "16px",
                  textAlign: "center",
                  color: "#fff",
                  background: urgent ? "var(--coral)" : "var(--teal)"
                }}
              >
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Link>
        ))}
      </nav>
      <div className="row" style={{ gap: 10, marginLeft: "auto" }}>
        <span className="who-name">{user}</span>
        <SignOutButton />
      </div>
    </header>
  );
}
