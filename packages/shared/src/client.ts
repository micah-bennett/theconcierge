"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job, PortalUser } from "./types";

export class ApiError extends Error {
  constructor(public status: number, message: string, public body: Record<string, unknown> = {}) {
    super(message);
  }
}

/** JSON fetch against this app's own /api. Throws ApiError with the server's `error` message. */
export async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  const body = (await r.json().catch(() => ({}))) as Record<string, unknown>;
  if (!r.ok) throw new ApiError(r.status, typeof body.error === "string" ? body.error : `Request failed (${r.status})`, body);
  return body as T;
}

export const authApi = {
  me: () => j<{ user: PortalUser }>("/api/auth?action=me"),
  login: (email: string, password: string) => j<{ user: PortalUser }>("/api/auth?action=login", { method: "POST", body: JSON.stringify({ email, password }) }),
  logout: () => j<{ ok: true }>("/api/auth?action=logout", { method: "POST" }),
  forgot: (email: string) => j<{ ok: true }>("/api/auth?action=forgot", { method: "POST", body: JSON.stringify({ email }) }),
  setPassword: (token: string, password: string) =>
    j<{ user: PortalUser; signedIn: boolean }>("/api/auth?action=set-password", { method: "POST", body: JSON.stringify({ token, password }) })
};

/** Jobs API. The server decides which jobs you see from your session (console: all, rep: yours). */
export const jobsApi = {
  list: () => j<{ jobs: Job[] }>("/api/jobs"),
  patch: (id: string, body: Partial<Job>) => j<Job>(`/api/jobs/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) })
};

/**
 * Polls jobs every 4 seconds. TODO(IT): swap for Server-Sent Events, Pusher, Ably, or Supabase Realtime.
 * Local edits are applied optimistically and sent with PATCH.
 * `onData` receives the full response so apps can read side data (the console's rep list).
 */
export function useJobs<R extends { jobs: Job[] } = { jobs: Job[] }>(opts: { interval?: number; onData?: (r: R) => void } = {}) {
  const { interval = 4000 } = opts;
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<Record<string, number>>({});
  const onData = useRef(opts.onData);
  onData.current = opts.onData;

  const refresh = useCallback(async () => {
    try {
      const res = await j<R>("/api/jobs");
      onData.current?.(res);
      setOnline(true);
      setLoaded(true);
      setJobs((cur) =>
        res.jobs.map((s) => {
          const local = cur.find((c) => c.id === s.id);
          return local && Date.now() - (pending.current[s.id] || 0) < 6000 ? local : s;
        })
      );
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, interval);
    return () => clearInterval(t);
  }, [refresh, interval]);

  /** Optimistic update + PATCH. Resolves with the server's job, or rejects with ApiError (and resyncs). */
  const update = useCallback(
    async (id: string, patch: Partial<Job>) => {
      pending.current[id] = Date.now();
      setJobs((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
      try {
        const saved = await jobsApi.patch(id, patch);
        setJobs((cur) => cur.map((x) => (x.id === id ? saved : x)));
        return saved;
      } catch (e) {
        pending.current[id] = 0;
        refresh();
        throw e;
      }
    },
    [refresh]
  );

  return { jobs, setJobs, online, loaded, refresh, update };
}
