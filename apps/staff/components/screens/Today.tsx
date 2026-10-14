"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import type { JobCat } from "@hop/shared/types";
import { CATS, greet, type Cat } from "@/lib/roles";
import { ReqRow, Ring, Svg, ic } from "../bits";
import { ClutchSheet, ComposeSheet, ConnectSheet, RescueSheet } from "../sheets";
import { useConnections, useStaff } from "../store";

/** Mockup `home`: greeting, shift, Rescue, Welcome back, Clutch, Ask HOP, suggestions, My requests. */
export function Today() {
  const { profile, role, requests, go } = useStaff();
  const { openSheet, toast } = usePhone();
  const conn = useConnections();
  const [openReq, setOpenReq] = useState<string | null>(null);
  const [sleepGuard, setSleepGuard] = useState(true);
  const on = role.state.startsWith("On");
  const compose = (cat: Cat, seed?: string) => openSheet(<ComposeSheet cat={cat} seed={seed} />);

  // Sample nudges (mockup "Suggested for you"); each opens the real Ask composer.
  const sug: [string, string, string, string, string, Cat][] = [
    ["🚗", "From your schedule", role.night ? "Long night. Want a ride home?" : "Your commute looks tight", "Traffic is heavier than usual. HOP can arrange a ride so you arrive calm.", "Book ride", "ride"],
    ["🍱", "From your patterns", "No lunch break on the books", "You missed 4 lunches this week. Send a meal to your unit at 12:30?", "Order lunch", "food"],
    ["🧘", "From your watch", "Recovery dipped last night", "Sleep came in at 5h 12m. A ten minute reset between 2 and 3 PM may help.", "Schedule reset", "errand"]
  ];

  return (
    <>
      <div className="hello disp">
        {greet()}, {profile?.firstName ?? ""}
      </div>
      <div className="sub">{[profile?.jobTitle, profile?.unitName].filter(Boolean).join(" · ")}</div>
      {/* Shift state is sample until a scheduling integration exists. TODO(IT) */}
      <div className="shiftbar">
        <small>{role.shift}</small>
        <div className="big">{role.state}</div>
        <div className="meta">{on ? role.next : "Next shift " + role.next}</div>
        <div className="prog">
          <i style={{ width: `${on ? 62 : 18}%` }} />
        </div>
      </div>
      <div className="card" style={{ borderColor: "#f3c3bf", background: "#fff7f6" }}>
        <div className="row">
          <div className="ico c">⏰</div>
          <div>
            <h3>Asked to stay late?</h3>
            <p>One tap and HOP covers tonight: pickups, pets, and dinner.</p>
          </div>
        </div>
        <button className="btn c w" style={{ marginTop: 12 }} onClick={() => openSheet(<RescueSheet />)}>
          Overtime Rescue
        </button>
      </div>
      <Welcome />
      <button className="clutch" onClick={() => openSheet(<ClutchSheet />)}>
        <span className="cz">⚡</span>
        <span style={{ flex: 1, textAlign: "left" }}>
          <b>In a bind? Hit Clutch.</b>
          <small>HOP drops everything and calls you in 2 minutes</small>
        </span>
        <span style={{ fontSize: 20 }}>›</span>
      </button>
      <div className="card">
        <h3>Ask HOP for anything</h3>
        <p>Pick a category. HOP finds the best help, tracks it, and confirms it is done.</p>
        <button className="askbar" onClick={() => compose("errand")}>
          <Svg p={ic.search} size={18} />
          What can we take off your plate?
        </button>
        <div className="cats" style={{ marginTop: 10, gridTemplateColumns: "repeat(6,1fr)" }}>
          {(Object.keys(CATS) as Cat[]).map((k) => (
            <button key={k} className="cat" onClick={() => compose(k)}>
              <span>{CATS[k][0]}</span>
              {CATS[k][1]}
            </button>
          ))}
        </div>
      </div>
      {conn.wear ? (
        <div className="card">
          <div className="row">
            <Ring v={72} />
            <div>
              <small style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted)" }}>Today&apos;s readiness</small>
              <h3 style={{ marginTop: 2 }}>Focused, mild stress</h3>
              <p style={{ fontSize: 12 }}>Sample · nothing is read from {conn.wear} until the privacy review</p>
            </div>
          </div>
          <div className="stats4">
            <div><b>5.2h</b><small>Sleep</small></div>
            <div><b>58</b><small>HRV ms</small></div>
            <div><b>8,420</b><small>Steps</small></div>
            <div><b>41m</b><small>Active</small></div>
          </div>
        </div>
      ) : (
        <div className="card" style={{ background: "linear-gradient(135deg,#e7f1fb,#e3f5f5)", borderColor: "#cfe3f7" }}>
          <div className="row">
            <div className="ico" style={{ background: "#fff" }}>⌚</div>
            <div>
              <h3>Connect your watch and calendar</h3>
              <p>HOP spots a rough night or a packed day and offers help before you have to ask. You choose what to share.</p>
            </div>
          </div>
          <button className="btn n w" style={{ marginTop: 12 }} onClick={() => openSheet(<ConnectSheet />)}>
            Connect now
          </button>
        </div>
      )}
      <div className="sect"><h2>Suggested for you</h2></div>
      <div className="hscroll">
        {sug.map((s) => (
          <div className="sug" key={s[2]}>
            <span className="tag s" style={{ alignSelf: "flex-start" }}>{s[1]}</span>
            <h3>{s[0]} {s[2]}</h3>
            <p>{s[3]}</p>
            <button className="btn p" onClick={() => compose(s[5], s[2])}>{s[4]}</button>
          </div>
        ))}
      </div>
      <div className="sect">
        <h2>Your requests</h2>
        <a role="button" onClick={() => compose("errand")}>New</a>
      </div>
      <div className="card" style={{ padding: "4px 16px" }}>
        {requests === null ? (
          <p className="mock" style={{ textAlign: "left" }}>Loading your requests…</p>
        ) : requests.length ? (
          requests.map((r) => <ReqRow key={r.id} r={r} open={openReq === r.id} onToggle={() => setOpenReq(openReq === r.id ? null : r.id)} />)
        ) : (
          <p className="mock" style={{ textAlign: "left" }}>No requests yet. Ask HOP for anything above and watch it here.</p>
        )}
      </div>
      <div className="card">
        <div className="row between">
          <div className="row">
            <div className="ico t">🛬</div>
            <div>
              <h3>Post Shift Landing</h3>
              <p>Ready for {role.night ? "Sat 8:00 AM" : "tonight 7:30 PM"}</p>
            </div>
          </div>
          <span className="tag">3 set</span>
        </div>
        <div style={{ marginTop: 10 }}>
          <div className="step"><span className="d done" /><div><b>Pharmacy pickup</b><small>At your door by landing time</small></div></div>
          <div className="step"><span className="d done" /><div><b>Scrubs laundry</b><small>Washed, folded, back Monday</small></div></div>
          <div className="step"><span className="d" /><div><b>Warm dinner at the door</b><small>Your saved favorite · tap to change</small></div></div>
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <div className="row">
            <div className="ico" style={{ background: "#ece8f8" }}>🌙</div>
            <div>
              <h3>Sleep Guard</h3>
              <p>{sleepGuard ? "On after night shifts. Deliveries wait, one summary when you wake." : "Off. Turn on to hold deliveries and alerts while you sleep."}</p>
            </div>
          </div>
          <button
            className={`toggle ${sleepGuard ? "on" : ""}`}
            aria-label="Sleep Guard"
            aria-pressed={sleepGuard}
            onClick={() => {
              setSleepGuard(!sleepGuard);
              toast(!sleepGuard ? "Sleep Guard is on. HOP will hold things while you rest." : "Sleep Guard is off.");
            }}
          />
        </div>
      </div>
      <div className="card">
        <div className="row between">
          <div className="row">
            <div className="ico s">🏠</div>
            <div>
              <h3>Home Ready</h3>
              <p>Groceries stocked and the porch package brought in before you get home.</p>
            </div>
          </div>
          <span className="tag s">Booked</span>
        </div>
      </div>
      <div className="sect">
        <h2>Your day, synced</h2>
        <a role="button" onClick={() => go("plan")}>My week</a>
      </div>
      {conn.cal.length ? (
        <div className="card list sched">
          {[["6:30", "Commute", "HOP ride · 12 min"], ["7:00", "Shift start", ""], ["12:30", "Lunch window", "Meal to the break room"], ["3:00", "Charting block", ""], ["5:30", "Soccer pickup", "Concierge arranged"], ["7:00", "Shift end", ""]].map((x, i) => (
            <div className="it" key={i}>
              <span className="tm">{x[0]}</span>
              <div className="grow">
                <b>{x[1]}</b>
                {x[2] && <small style={{ color: "#037e80", fontWeight: 600 }}>{x[2]}</small>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card">
          <div className="row">
            <div className="ico s">📅</div>
            <div>
              <h3>Bring your calendars together</h3>
              <p>Connect a personal calendar and your work schedule so HOP can fill the gaps.</p>
            </div>
          </div>
          <button className="btn o w" style={{ marginTop: 12 }} onClick={() => openSheet(<ConnectSheet />)}>
            Connect a calendar
          </button>
        </div>
      )}
      <div className="mock">Your requests are live. Shifts, suggestions, and synced days are samples until HOP connects to your schedule.</div>
    </>
  );
}

type W = [key: string, icon: string, from: string, said: string, action: string, cat: JobCat, text: string, source: string];

/** Mockup `welcome`: sample observations, each with a button that creates a real request. */
function Welcome() {
  const { requests, ask, consentOn, go } = useStaff();
  const [done, setDone] = useState<Record<string, boolean>>({});
  const all: W[] = [
    ["cal", "📅", "From your calendar", "Aria's recital is tomorrow at 5. You are on until 7:30.", "Cover pickup and send flowers", "family", "Recital pickup and flowers", "Your calendars"],
    ["watch", "🌙", "From your watch", "You slept 4h 50m. Rough one.", "Hold deliveries and send dinner at 6", "food", "Dinner at 6 PM and hold deliveries", "Your watch"],
    ["sched", "🗓️", "From your schedule", "You picked up Saturday. Swap and Save unlocked.", "Use my free errand bundle", "errand", "Swap and Save errand bundle", "Your work schedule"],
    ["saved", "🔖", "Saved with HOP", "You saved a gift idea for Ruth's birthday.", "Order it and wrap it", "errand", "Order and wrap the gift for Ruth", "Saved with HOP"],
    ["habit", "☕", "What HOP knows about you", "It is your third 12 hour shift in a row.", "Send your usual latte at 2 PM", "food", "Large oat milk latte at 2 PM", "What you do in HOP"]
  ];
  const asked = new Set((requests || []).filter((r) => r.source === "welcome").map((r) => r.text));
  const list = all.filter((w) => consentOn(`learn:${w[7]}`) && !done[w[0]] && !asked.has(w[6])).slice(0, 3);
  if (!list.length) return null;
  return (
    <div className="card welcome">
      <div className="row between">
        <div>
          <small className="kick" style={{ color: "#7fd3d4" }}>Welcome back</small>
          <h3 style={{ color: "#fff", fontSize: 17, marginTop: 2 }}>While you were away, HOP noticed</h3>
        </div>
        <span style={{ fontSize: 22 }}>👋</span>
      </div>
      {list.map((w) => (
        <div className="wb" key={w[0]}>
          <div className="row" style={{ gap: 10, alignItems: "flex-start" }}>
            <span style={{ fontSize: 18 }}>{w[1]}</span>
            <div style={{ flex: 1 }}>
              <small>{w[2]}</small>
              <p>{w[3]}</p>
              <button
                className="btn p"
                style={{ padding: "7px 12px", fontSize: 12, marginTop: 8 }}
                onClick={async () => {
                  setDone((d) => ({ ...d, [w[0]]: true }));
                  if (!(await ask({ cat: w[5], text: w[6], source: "welcome" }, "On it. HOP has this one."))) setDone((d) => ({ ...d, [w[0]]: false }));
                }}
              >
                {w[4]}
              </button>
            </div>
          </div>
        </div>
      ))}
      <a role="button" onClick={() => go("know")} style={{ display: "block", marginTop: 10, fontSize: 12.5, color: "#7fd3d4", fontWeight: 700, cursor: "pointer" }}>
        Why am I seeing this? See what HOP knows ›
      </a>
      {/* Sample observations: no calendar, watch or schedule data is read yet (privacy review). TODO(IT) */}
    </div>
  );
}
