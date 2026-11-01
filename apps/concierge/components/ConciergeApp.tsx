"use client";
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { ApiError, j } from "@hop/shared/client";
import { Phone } from "@hop/shared/ui/Phone";
import type { CustomerProfile, MyConciergeRequest } from "@/lib/types";
import type { Draft } from "./RequestForm";
import { RequestForm } from "./RequestForm";
import { MyRequests } from "./MyRequests";
import { Messages } from "./Messages";
import { Profile } from "./Profile";

/*
 * Concierge Portal: an individual customer's own phone-style app. Four tabs: Request (the concierge
 * form), My requests (live status, cancel, request again), Messages (HOP Concierge and the rep) and
 * Profile. Identity comes from the session; nothing here belongs to an organization.
 */

export type TabKey = "request" | "mine" | "messages" | "profile";

const ICON = {
  request: '<path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="4"/>',
  mine: '<path d="M9 6h11M9 12h11M9 18h11"/><path d="M4 6l1 1 2-2M4 12l1 1 2-2M4 18l1 1 2-2"/>',
  messages: '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z"/>',
  profile: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>'
};

const TABS = [
  { key: "request", label: "Request", icon: ICON.request },
  { key: "mine", label: "My requests", icon: ICON.mine },
  { key: "messages", label: "Messages", icon: ICON.messages },
  { key: "profile", label: "Profile", icon: ICON.profile }
];

type Ctx = {
  profile: CustomerProfile | null;
  setProfile: (p: CustomerProfile) => void;
  requests: MyConciergeRequest[] | null;
  refreshRequests: () => Promise<void>;
  tab: TabKey;
  go: (t: TabKey) => void;
  /** A form prefill ("Request again"). The form consumes it once. */
  draft: Partial<Draft> | null;
  setDraft: (d: Partial<Draft> | null) => void;
};

const ConciergeCtx = createContext<Ctx | null>(null);
export const useConcierge = () => {
  const c = useContext(ConciergeCtx);
  if (!c) throw new Error("useConcierge outside ConciergeApp");
  return c;
};

const onAuthError = (e: unknown) => {
  if (e instanceof ApiError && e.status === 401) window.location.href = "/login";
};

export function ConciergeApp() {
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [requests, setRequests] = useState<MyConciergeRequest[] | null>(null);
  const [tab, setTab] = useState<TabKey>("request");
  const [draft, setDraft] = useState<Partial<Draft> | null>(null);

  useEffect(() => {
    j<{ profile: CustomerProfile }>("/api/me")
      .then((r) => setProfile(r.profile))
      .catch(onAuthError);
  }, []);

  const refreshRequests = useCallback(async () => {
    try {
      setRequests((await j<{ requests: MyConciergeRequest[] }>("/api/requests")).requests);
    } catch (e) {
      onAuthError(e);
    }
  }, []);

  // Live status: poll every 10 s. TODO(IT): swap for server-sent events with the other apps' polling.
  useEffect(() => {
    refreshRequests();
    const t = setInterval(refreshRequests, 10_000);
    return () => clearInterval(t);
  }, [refreshRequests]);

  const go = useCallback((t: TabKey) => {
    setTab(t);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }, []);

  return (
    <ConciergeCtx.Provider value={{ profile, setProfile, requests, refreshRequests, tab, go, draft, setDraft }}>
      <Phone tabs={TABS} tab={tab} onTab={(k) => go(k as TabKey)}>
        <div className="top">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="HOP" />
          <span className="kick">The Concierge</span>
        </div>
        {tab === "request" && <RequestForm />}
        {tab === "mine" && <MyRequests />}
        {tab === "messages" && <Messages />}
        {tab === "profile" && <Profile />}
      </Phone>
    </ConciergeCtx.Provider>
  );
}
