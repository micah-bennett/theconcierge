"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { authApi } from "../client";

/**
 * Top bar for the desktop apps (Console, Facility). Logo + app name, optional nav links,
 * the signed-in user's name, and Sign out.
 */
export function AppHeader({ name, nav = [], user, right }: { name: string; nav?: { href: string; label: string }[]; user?: string; right?: ReactNode }) {
  const path = usePathname();
  return (
    <header className="viewbar">
      <Link href="/" className="brand" style={{ textDecoration: "none" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="HOP" />
        <span className="appname">{name}</span>
      </Link>
      {nav.length > 0 && (
        <nav className="seg" aria-label="Sections">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={path === n.href ? "on" : ""}>
              {n.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="row" style={{ gap: 10, marginLeft: "auto" }}>
        {right}
        {user && <span className="who-name">{user}</span>}
        <SignOutButton />
      </div>
    </header>
  );
}

export function SignOutButton({ className = "btn o", style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <button
      className={className}
      style={{ padding: "7px 12px", fontSize: 13, ...style }}
      onClick={async () => {
        await authApi.logout().catch(() => {});
        window.location.href = "/login";
      }}
    >
      Sign out
    </button>
  );
}
