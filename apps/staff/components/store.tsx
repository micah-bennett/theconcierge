"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ApiError, j } from "@hop/shared/client";
import { usePhone } from "@hop/shared/ui/Phone";
import type { JobCat } from "@hop/shared/types";
import { LEARN_SOURCES, type Pref } from "@/lib/content";
import { pickRole, type SampleRole } from "@/lib/roles";
import type { Profile, MyReq } from "@/lib/types";

export type Screen = "home" | "plan" | "life" | "me" | "crew" | "you" | "know" | "smart";
export type AskSource = "ask" | "clutch" | "rescue" | "voice" | "chat" | "welcome" | "life";
export type AskInput = { cat: JobCat; text: string; urgent?: boolean; window?: string; source: AskSource };
type PatchBody = { prefs: Pref[] } | { claim: string } | { consent: { source: string; granted: boolean; scopes?: string[] } };
export type ChatMsg = ["ai" | "me", string];

type Ctx = {
  profile: Profile | null;
  role: SampleRole;
  requests: MyReq[] | null;
  screen: Screen;
  go: (s: Screen) => void;
  /** Sends a real request to the Console queue. Resolves true when it was saved. */
  ask: (input: AskInput, okMsg?: string) => Promise<boolean>;
  patch: (body: PatchBody) => Promise<{ profile: Profile; added?: number } | null>;
  setPrefs: (prefs: Pref[]) => void;
  /** A Week delivery window picked by the member; attached to their next request. */
  pickedWindow: string | null;
  setPickedWindow: (w: string | null) => void;
  /** Consent switch (learn:/priv:/wear:/cal:/work:) with its default when never set. */
  consentOn: (key: string, dflt?: boolean) => boolean;
  setConsent: (key: string, granted: boolean, scopes?: string[]) => Promise<boolean>;
  // Sample, this session only.
  homeConn: Record<string, boolean>;
  setHomeConn: (v: Record<string, boolean>) => void;
  thread: ChatMsg[];
  setThread: (fn: (t: ChatMsg[]) => ChatMsg[]) => void;
};

const StaffCtx = createContext<Ctx | null>(null);
const ToastSink = createContext<{ current: (m: string) => void } | null>(null);

/** Render once inside <Phone>: connects the phone's toast to StaffProvider. */
export function PhoneBridge() {
  const { toast } = usePhone();
  const sink = useContext(ToastSink);
  useEffect(() => {
    if (sink) sink.current = toast;
  }, [sink, toast]);
  return null;
}

export function useStaff(): Ctx {
  const c = useContext(StaffCtx);
  if (!c) throw new Error("useStaff outside StaffProvider");
  return c;
}

const THREAD0: ChatMsg[] = [
  ["ai", "Hi, I am Hop, your single point of contact. I watch your day so you can focus on care. How are you feeling?"],
  ["me", "A little wiped, honestly. Rough night."],
  ["ai", "I hear you. Sleep came in at 5h 12m. I lined up a ride so the commute is one less thing, and I will protect a lunch window at 12:30. Sound good?"]
];

const LEARN_DEFAULTS = Object.fromEntries(LEARN_SOURCES.map(([k, , d]) => [`learn:${k}`, d]));

/**
 * Holds the member's real profile and requests (polled), plus the session-only sample state.
 * It wraps <Phone> so the bottom sheets (rendered by Phone outside its children) can use it too;
 * <PhoneBridge /> inside Phone hands this provider the phone's toast.
 */
export function StaffProvider({ children }: { children: ReactNode }) {
  const toastRef = useRef<(m: string) => void>(() => {});
  const toast = useCallback((m: string) => toastRef.current(m), []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<MyReq[] | null>(null);
  const [screen, setScreen] = useState<Screen>("home");
  const [pickedWindow, setPickedWindow] = useState<string | null>(null);
  const [homeConn, setHomeConn] = useState<Record<string, boolean>>({});
  const [thread, setThreadState] = useState<ChatMsg[]>(THREAD0);
  const pickedRef = useRef(pickedWindow);
  pickedRef.current = pickedWindow;

  const onErr = useCallback(
    (e: unknown) => {
      if (e instanceof ApiError && e.status === 401) {
        window.location.href = "/login";
        return;
      }
      toast(e instanceof Error ? e.message : "Something went wrong");
    },
    [toast]
  );

  const loadRequests = useCallback(async () => {
    try {
      const r = await j<{ requests: MyReq[] }>("/api/requests");
      setRequests(r.requests);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
    }
  }, []);

  useEffect(() => {
    j<{ profile: Profile }>("/api/profile").then((r) => setProfile(r.profile)).catch(onErr);
    loadRequests();
    // Live status of "My requests". TODO(IT): swap polling for SSE/Pusher/Ably with the other apps.
    const t = setInterval(loadRequests, 5000);
    return () => clearInterval(t);
  }, [loadRequests, onErr]);

  const go = useCallback((s: Screen) => {
    setScreen(s);
    document.querySelector(".screen")?.scrollTo({ top: 0 });
  }, []);

  const ask = useCallback(
    async (input: AskInput, okMsg = "Sent. HOP is finding the best option.") => {
      // A picked Week window rides along on the next non-urgent request that doesn't set its own.
      const usePicked = !input.window && !input.urgent && !!pickedRef.current;
      const window_ = input.window ?? (usePicked ? pickedRef.current! : undefined);
      try {
        await j("/api/requests", { method: "POST", body: JSON.stringify({ ...input, ...(window_ ? { window: window_ } : {}) }) });
        if (usePicked) setPickedWindow(null);
        toast(okMsg);
        loadRequests();
        return true;
      } catch (e) {
        onErr(e);
        return false;
      }
    },
    [loadRequests, onErr, toast]
  );

  const patch = useCallback(
    async (body: PatchBody) => {
      try {
        const r = await j<{ profile: Profile; added?: number }>("/api/profile", { method: "PATCH", body: JSON.stringify(body) });
        setProfile(r.profile);
        return r;
      } catch (e) {
        onErr(e);
        // Resync with the server after a failed optimistic change.
        j<{ profile: Profile }>("/api/profile").then((r) => setProfile(r.profile)).catch(() => {});
        return null;
      }
    },
    [onErr]
  );

  const setPrefs = useCallback(
    (prefs: Pref[]) => {
      setProfile((p) => (p ? { ...p, prefs } : p));
      patch({ prefs });
    },
    [patch]
  );

  const consentOn = useCallback(
    (key: string, dflt?: boolean) => {
      const c = profile?.consents[key];
      if (c) return c.granted;
      if (dflt !== undefined) return dflt;
      if (key in LEARN_DEFAULTS) return LEARN_DEFAULTS[key];
      return key.startsWith("priv:");
    },
    [profile]
  );

  const setConsent = useCallback(
    async (key: string, granted: boolean, scopes?: string[]) => {
      setProfile((p) => (p ? { ...p, consents: { ...p.consents, [key]: { granted, ...(scopes ? { scopes } : {}), at: new Date().toISOString() } } } : p));
      return !!(await patch({ consent: { source: key, granted, ...(scopes ? { scopes } : {}) } }));
    },
    [patch]
  );

  const value = useMemo<Ctx>(
    () => ({
      profile,
      role: pickRole(profile?.jobTitle || ""),
      requests,
      screen,
      go,
      ask,
      patch,
      setPrefs,
      pickedWindow,
      setPickedWindow,
      consentOn,
      setConsent,
      homeConn,
      setHomeConn,
      thread,
      setThread: (fn) => setThreadState(fn)
    }),
    [profile, requests, screen, go, ask, patch, setPrefs, pickedWindow, consentOn, setConsent, homeConn, thread]
  );

  return (
    <ToastSink.Provider value={toastRef}>
      <StaffCtx.Provider value={value}>{children}</StaffCtx.Provider>
    </ToastSink.Provider>
  );
}

/** Connected apps from consents: one watch, any calendars, the work schedule. */
export function useConnections() {
  const { profile } = useStaff();
  const on = Object.entries(profile?.consents || {}).filter(([, v]) => v.granted).map(([k]) => k);
  const pick = (p: string) => on.filter((k) => k.startsWith(p)).map((k) => k.slice(p.length));
  return { wear: pick("wear:")[0] ?? null, cal: pick("cal:"), work: pick("work:").length > 0 };
}
