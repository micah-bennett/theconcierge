"use client";
import { usePhone } from "@hop/shared/ui/Phone";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import { PRIVACY } from "@/lib/content";
import { initials } from "@/lib/roles";
import { ConnectSheet } from "../sheets";
import { useConnections, useStaff } from "../store";

/** Mockup `you`: the real profile, points, links, connected apps (consent intent) and privacy switches. */
export function You() {
  const { profile, go, consentOn, setConsent } = useStaff();
  const { openSheet } = usePhone();
  const conn = useConnections();
  if (!profile) return <p className="mock">Loading your profile…</p>;
  const since = new Date(profile.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" });

  return (
    <>
      <div className="row" style={{ gap: 14, marginBottom: 16 }}>
        <div className="avatar" style={{ width: 60, height: 60, fontSize: 20 }}>{initials(profile.firstName, profile.lastName)}</div>
        <div style={{ minWidth: 0 }}>
          <div className="hello disp" style={{ fontSize: 21, margin: 0 }}>
            {profile.firstName} {profile.lastName}
          </div>
          <div className="sub" style={{ margin: 0 }}>{[profile.jobTitle, profile.unitName].filter(Boolean).join(" · ")}</div>
          {profile.facilityName && <div className="sub" style={{ margin: 0, fontSize: 12.5 }}>{profile.facilityName}</div>}
        </div>
      </div>
      <div className="grid2">
        <div className="tile"><b>Member since</b><span>{since}</span></div>
        <div className="tile"><b>{profile.points.toLocaleString()} pts</b><span>Recharge balance</span></div>
      </div>
      <button className="card" onClick={() => go("smart")} style={{ width: "100%", textAlign: "left", display: "block" }}>
        <div className="row between">
          <div className="row">
            <div className="ico t">🏠</div>
            <div>
              <h3>Smart home and voice</h3>
              <p>Alexa, Apple, Android, and door access</p>
            </div>
          </div>
          <span style={{ fontSize: 20, color: "var(--muted)" }}>›</span>
        </div>
      </button>
      <button className="card" onClick={() => go("know")} style={{ width: "100%", textAlign: "left", display: "block" }}>
        <div className="row between">
          <div className="row">
            <div className="ico t">🧠</div>
            <div>
              <h3>HOP knows you</h3>
              <p>{profile.prefs.length} things learned · fix or forget anytime</p>
            </div>
          </div>
          <span style={{ fontSize: 20, color: "var(--muted)" }}>›</span>
        </div>
      </button>
      <div className="sect">
        <h2>Connected apps</h2>
        <a role="button" onClick={() => openSheet(<ConnectSheet />)}>Manage</a>
      </div>
      <div className="card list">
        {([["⌚", "Watch or health app", conn.wear || ""], ["📅", "Calendars", conn.cal.join(", ")], ["🗓️", "Work schedule", conn.work ? "Unit schedule app" : ""]] as const).map((x) => (
          <div className="it" key={x[1]}>
            <div className="ico t">{x[0]}</div>
            <div className="grow">
              <b>{x[1]}</b>
              <small>{x[2] || "Not connected"}</small>
            </div>
            <span className={`tag ${x[2] ? "" : "g"}`}>{x[2] ? "On" : "Off"}</span>
          </div>
        ))}
      </div>
      <p className="mock">Connecting records your consent only. No watch, calendar, or schedule data is read until the privacy review is done.</p>
      <div className="sect"><h2>Your privacy</h2></div>
      <div className="card">
        <p style={{ marginBottom: 6 }}>HOP only uses what you allow. Turn anything off, anytime.</p>
        <div className="list">
          {PRIVACY.map((k) => {
            const on = consentOn(`priv:${k}`);
            return (
              <div className="it" key={k}>
                <div className="grow">
                  <b style={{ fontSize: 13.5 }}>{k}</b>
                  <small>{on ? "On" : "Off"}</small>
                </div>
                <button className={`toggle ${on ? "on" : ""}`} aria-label={k} aria-pressed={on} onClick={() => setConsent(`priv:${k}`, !on)} />
              </div>
            );
          })}
        </div>
      </div>
      <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
        <div className="row">
          <div className="ico" style={{ background: "#fff" }}>🔒</div>
          <div>
            <h3>Your requests stay yours</h3>
            <p>Your hospital only sees anonymized totals, never who asked for what.</p>
          </div>
        </div>
      </div>
      <button className="btn o w" onClick={() => go("home")}>Back to Today</button>
      <SignOutButton className="btn o w" style={{ marginTop: 8, padding: "13px 16px", fontSize: 15 }} />
    </>
  );
}
