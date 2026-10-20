"use client";
import { useEffect, useState } from "react";
import { messagesApi } from "@hop/shared/client";
import { Phone, usePhone } from "@hop/shared/ui/Phone";
import { initials } from "@/lib/roles";
import { Svg, ic } from "./bits";
import { ChatSheet, VoiceSheet } from "./sheets";
import { PhoneBridge, StaffProvider, useStaff, type Screen } from "./store";
import { Today } from "./screens/Today";
import { Week } from "./screens/Week";
import { Life } from "./screens/Life";
import { Recharge } from "./screens/Recharge";
import { Crew } from "./screens/Crew";
import { You } from "./screens/You";
import { Know } from "./screens/Know";
import { Smart } from "./screens/Smart";

/*
 * HOP Client (formerly the Staff App): the mockup's structure (staff-app.html) in the starter's React style.
 * Five tabs (Today, Week, Life, Recharge, Crew), plus You, HOP knows you and Smart home from the
 * top bar. Identity comes from the session; there is no "See it as" picker.
 */

const TABS = [
  { key: "home", label: "Today", icon: ic.home },
  { key: "plan", label: "Week", icon: ic.plan },
  { key: "life", label: "Life", icon: ic.life },
  { key: "me", label: "Recharge", icon: ic.me },
  { key: "crew", label: "Crew", icon: ic.crew }
];

export function StaffApp() {
  return (
    <StaffProvider>
      <Shell />
    </StaffProvider>
  );
}

function Shell() {
  const { screen, go } = useStaff();
  return (
    <Phone tabs={TABS} tab={screen} onTab={(k) => go(k as Screen)} fab={<Fab />}>
      <PhoneBridge />
      <TopBar />
      {screen === "home" && <Today />}
      {screen === "plan" && <Week />}
      {screen === "life" && <Life />}
      {screen === "me" && <Recharge />}
      {screen === "crew" && <Crew />}
      {screen === "you" && <You />}
      {screen === "know" && <Know />}
      {screen === "smart" && <Smart />}
    </Phone>
  );
}

/** Unread messages across my HOP Concierge and job threads, polled every 15 s. */
function useUnread() {
  const [n, setN] = useState(0);
  useEffect(() => {
    let live = true;
    const pull = () =>
      messagesApi
        .threads()
        .then((r) => live && setN(r.threads.reduce((s, t) => s + t.unread, 0)))
        .catch(() => {});
    pull();
    const t = setInterval(pull, 15000);
    return () => {
      live = false;
      clearInterval(t);
    };
  }, []);
  return [n, setN] as const;
}

function TopBar() {
  const { profile, go } = useStaff();
  const { openSheet } = usePhone();
  const [unread, setUnread] = useUnread();
  return (
    <div className="top">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt="HOP" />
      <div className="row" style={{ gap: 8 }}>
        <button
          className="iconbtn"
          aria-label={unread ? `Message HOP Concierge, ${unread} unread` : "Message HOP Concierge"}
          style={{ position: "relative" }}
          onClick={() => {
            setUnread(0);
            openSheet(<ChatSheet />);
          }}
        >
          <Svg p={ic.chat} />
          {unread > 0 && (
            <span
              aria-hidden
              style={{ position: "absolute", top: -3, right: -3, minWidth: 18, height: 18, padding: "0 5px", borderRadius: 99, background: "var(--coral)", color: "#fff", fontSize: 11, fontWeight: 800, display: "grid", placeItems: "center" }}
            >
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
        <button className="avatar" aria-label="Your profile" onClick={() => go("you")}>
          {profile ? initials(profile.firstName, profile.lastName) : ""}
          <span className="dot" />
        </button>
      </div>
    </div>
  );
}

function Fab() {
  const { openSheet } = usePhone();
  return (
    <button className="fab" aria-label="Voice errand drop" onClick={() => openSheet(<VoiceSheet />)}>
      <Svg p={ic.mic} />
    </button>
  );
}
