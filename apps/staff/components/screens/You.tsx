"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { SignOutButton } from "@hop/shared/ui/AppHeader";
import { PRIVACY } from "@/lib/content";
import { initials } from "@/lib/roles";
import { DAY_SHORT, fmtTime, overnight } from "@/lib/shift";
import type { ShiftPattern } from "@/lib/types";
import { ConnectSheet } from "../sheets";
import { useConnections, useStaff } from "../store";

/** You: the real profile, points, your shifts (editable), connected apps (consent only) and privacy switches. */
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
      <ShiftEditor />
      <button className="card" onClick={() => go("know")} style={{ width: "100%", textAlign: "left", display: "block" }}>
        <div className="row between">
          <div className="row">
            <div className="ico t">🧠</div>
            <div>
              <h3>HOP knows you</h3>
              <p>{profile.prefs.length ? `${profile.prefs.length} thing${profile.prefs.length === 1 ? "" : "s"} you taught HOP` : "Teach HOP your preferences"} · fix or forget anytime</p>
            </div>
          </div>
          <span style={{ fontSize: 20, color: "var(--muted)" }}>›</span>
        </div>
      </button>
      <button className="card" onClick={() => go("smart")} style={{ width: "100%", textAlign: "left", display: "block" }}>
        <div className="row between">
          <div className="row">
            <div className="ico t">🏠</div>
            <div>
              <h3>Smart home, voice and door access</h3>
              <p>How door approval works, and what&apos;s coming</p>
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
              <small>{x[2] ? `${x[2]} · choice saved` : "Not set"}</small>
            </div>
            <span className={`tag ${x[2] ? "" : "g"}`}>{x[2] ? "On" : "Off"}</span>
          </div>
        ))}
      </div>
      <p className="mock">We&apos;ll connect these when they&apos;re ready. Today HOP only saves your choice; no watch, calendar, or schedule data is read until the privacy review is done.</p>
      <div className="sect"><h2>Your privacy</h2></div>
      <div className="card">
        <p style={{ marginBottom: 6 }}>HOP only uses what you allow. Turn anything off, anytime.</p>
        <div className="list">
          {PRIVACY.map(([k, onText, offText]) => {
            const on = consentOn(`priv:${k}`);
            return (
              <div className="it" key={k}>
                <div className="grow">
                  <b style={{ fontSize: 13.5 }}>{k}</b>
                  <small>{on ? onText : offText}</small>
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
            <p>Your hospital only sees unit totals from 5 or more people, never who asked for what or how you checked in.</p>
          </div>
        </div>
      </div>
      <button className="btn o w" onClick={() => go("home")}>Back to Today</button>
      <SignOutButton className="btn o w" style={{ marginTop: 8, padding: "13px 16px", fontSize: 15 }} />
    </>
  );
}

/** Your usual shifts (portal_staff_profiles.shift_pattern): days, start, end, night shift. */
function ShiftEditor() {
  const { me, act } = useStaff();
  const { toast } = usePhone();
  const [edit, setEdit] = useState<ShiftPattern | null>(null);
  const [busy, setBusy] = useState(false);
  const cur = me?.shift ?? null;

  async function save(next: ShiftPattern | null) {
    if (next && !next.days.length) return toast("Pick at least one day.");
    if (next && next.start === next.end) return toast("Start and end can't be the same time.");
    setBusy(true);
    const r = await act("shift", { shift: next });
    setBusy(false);
    if (!r) return;
    setEdit(null);
    toast(next ? "Shifts saved. Today and My Week use them now." : "Shifts cleared.");
  }

  if (!edit) {
    return (
      <div className="card">
        <div className="row between">
          <div className="row">
            <div className="ico t">🗓️</div>
            <div>
              <h3>Your shifts</h3>
              <p>
                {!me
                  ? "Loading…"
                  : cur
                    ? `${cur.days.map((d) => DAY_SHORT[d]).join(", ") || "No days"} · ${fmtTime(cur.start)} to ${fmtTime(cur.end)}${cur.night ? " · nights" : ""}`
                    : "Not set yet. Add them so HOP plans around your shifts."}
              </p>
            </div>
          </div>
          <button className="btn p" style={{ padding: "7px 12px", fontSize: 12 }} disabled={!me} onClick={() => setEdit(cur ?? { days: [0, 1, 2], start: "07:00", end: "19:00", night: false })}>
            {cur ? "Edit" : "Add"}
          </button>
        </div>
      </div>
    );
  }

  const set = (p: Partial<ShiftPattern>) =>
    setEdit((e) => {
      const n = { ...e!, ...p };
      // An end before the start means the shift runs overnight.
      if (p.start || p.end) n.night = overnight(n);
      return n;
    });
  return (
    <div className="card">
      <h3>Your shifts</h3>
      <p style={{ fontSize: 12.5 }}>Your usual pattern. Only you and HOP see it.</p>
      <div className="moods">
        {DAY_SHORT.map((d, i) => {
          const on = edit.days.includes(i);
          return (
            <button key={d} className={`chip ${on ? "on" : ""}`} aria-pressed={on} onClick={() => set({ days: on ? edit.days.filter((x) => x !== i) : [...edit.days, i].sort() })}>
              {d}
            </button>
          );
        })}
      </div>
      <div className="row" style={{ gap: 10 }}>
        <label className="dl" style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Starts</span>
          <input className="field" type="time" value={edit.start} onChange={(e) => e.target.value && set({ start: e.target.value })} />
        </label>
        <label className="dl" style={{ flex: 1 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>Ends</span>
          <input className="field" type="time" value={edit.end} onChange={(e) => e.target.value && set({ end: e.target.value })} />
        </label>
      </div>
      <div className="row between" style={{ marginTop: 10 }}>
        <span style={{ fontSize: 13.5 }}>Night shift (ends the next morning)</span>
        <button className={`toggle ${edit.night ? "on" : ""}`} aria-label="Night shift" aria-pressed={edit.night} onClick={() => set({ night: !edit.night })} />
      </div>
      <div className="row" style={{ gap: 8, marginTop: 12 }}>
        <button className="btn p" style={{ flex: 1 }} disabled={busy} onClick={() => save(edit)}>
          {busy ? "Saving…" : "Save shifts"}
        </button>
        <button className="btn o" onClick={() => setEdit(null)}>Cancel</button>
      </div>
      {cur && (
        <button className="btn o w" style={{ marginTop: 8 }} disabled={busy} onClick={() => save(null)}>
          Clear my shifts
        </button>
      )}
    </div>
  );
}
