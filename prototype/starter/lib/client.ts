"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Job, StaffRequest } from "./types";

async function j<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, cache: "no-store", headers: { "Content-Type": "application/json", ...(init?.headers || {}) } });
  if (!r.ok) throw new Error(`${r.status}`);
  return r.json();
}

export const api = {
  jobs: (rep?: string) => j<Job[]>(`/api/jobs${rep ? `?rep=${encodeURIComponent(rep)}` : ""}`),
  createJob: (body: unknown) => j<Job>("/api/jobs", { method: "POST", body: JSON.stringify(body) }),
  patchJob: (id: string, body: Partial<Job>) => j<Job>(`/api/jobs/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  requests: () => j<StaffRequest[]>("/api/requests"),
  createRequest: (body: unknown) => j<StaffRequest>("/api/requests", { method: "POST", body: JSON.stringify(body) }),
  upload: (dataUrl: string, kind: "photo" | "signature", jobId: string) =>
    j<{ url: string }>("/api/uploads", { method: "POST", body: JSON.stringify({ dataUrl, kind, jobId }) })
};

/**
 * Polls jobs every 4 seconds. Swap for Server-Sent Events, Pusher, Ably, or Supabase Realtime in production.
 * Local edits are applied optimistically and sent with PATCH.
 */
export function useJobs(rep?: string, interval = 4000) {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [online, setOnline] = useState<boolean | null>(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useRef<Record<string, number>>({});

  const refresh = useCallback(async () => {
    try {
      const list = await api.jobs(rep);
      setOnline(true);
      setLoaded(true);
      setJobs((cur) =>
        list.map((s) => {
          const local = cur.find((c) => c.id === s.id);
          return local && Date.now() - (pending.current[s.id] || 0) < 6000 ? local : s;
        })
      );
    } catch {
      setOnline(false);
    }
  }, [rep]);

  useEffect(() => {
    setJobs([]);
    setLoaded(false);
    refresh();
    const t = setInterval(refresh, interval);
    return () => clearInterval(t);
  }, [refresh, interval]);

  const update = useCallback((id: string, patch: Partial<Job>) => {
    pending.current[id] = Date.now();
    setJobs((cur) => cur.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    api.patchJob(id, patch).catch(() => {});
  }, []);

  return { jobs, setJobs, online, loaded, refresh, update };
}
