"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { useStaff } from "../store";

const D = ["M", "T", "W", "T", "F", "S", "S"];
const DAY = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Mockup `plan`: shift-aware week with Sleep Guard and delivery windows. The shift pattern is
 * sample (from the closest sample role). Picking a window attaches it to the member's next request.
 */
export function Week() {
  const { role, pickedWindow, setPickedWindow } = useStaff();
  const { toast } = usePhone();
  const now = new Date();
  const todayIdx = (now.getDay() + 6) % 7;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx);
  const dates = D.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const [day, setDay] = useState(todayIdx);
  const isShift = role.pattern[day] === 1;
  const y = (h: number) => (h - 6) * 15 + 12;
  const hrs: number[] = [];
  for (let h = 6; h <= 22; h += 2) hrs.push(h);

  const label = (w: string) => `${DAY[day]} ${dates[day].getDate()}, ${w}`;
  const win = (w: string, top: number, suffix = "open") => {
    const l = label(w);
    return (
      <div
        key={w}
        className={`blk win ${pickedWindow === l ? "picked" : ""}`}
        style={{ top, height: 30 }}
        role="button"
        onClick={() => {
          setPickedWindow(l);
          toast(`Delivery set for ${w}. Your next request will use it.`);
        }}
      >
        {w} · {suffix}
      </div>
    );
  };

  return (
    <>
      <div className="hello disp">My Week</div>
      <div className="sub">HOP only offers times when you are actually off.</div>
      <div className="week">
        {D.map((d, i) => (
          <div key={i} className={`day ${i === day ? "on" : ""}`} role="button" onClick={() => setDay(i)}>
            <small>{d}</small>
            <b>{dates[i].getDate()}</b>
            <i style={{ background: role.pattern[i] ? "var(--sky)" : "transparent" }} />
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 14, margin: "0 2px 10px", fontSize: 12, color: "var(--muted)" }}>
        <span>▧ Shift</span>
        <span style={{ color: "#037e80" }}>▢ Open for delivery</span>
        <span style={{ color: "#5a4a9a" }}>■ Quiet hours</span>
      </div>
      <div className="timeline">
        {hrs.map((h) => (
          <div className="hr" key={h}>
            <span>
              {h > 12 ? h - 12 : h}
              {h >= 12 ? "p" : "a"}
            </span>
          </div>
        ))}
        {isShift ? (
          role.night ? (
            <>
              <div className="blk shift" style={{ top: y(6), height: 22 }}>Shift ends 7:30 AM</div>
              <div className="blk sleep" style={{ top: y(8.5), height: 90 }}>Sleep Guard · quiet hours</div>
              {win("3 to 5 PM", y(15), "open for delivery")}
              <div className="blk shift" style={{ top: y(19), height: 45 }}>Shift starts 7:00 PM</div>
            </>
          ) : (
            <>
              <div className="blk shift" style={{ top: y(7), height: 180 }}>{role.shift} · deliveries paused</div>
              {win("7:30 to 9:30 PM", y(19.5))}
            </>
          )
        ) : (
          <>
            {win("10 AM to noon", y(10))}
            {win("3 to 5 PM", y(15))}
          </>
        )}
      </div>
      {pickedWindow && (
        <div className="card" style={{ background: "var(--soft-teal)", borderColor: "#bfe6e6" }}>
          <div className="row between">
            <div>
              <h3>Next request: {pickedWindow}</h3>
              <p>Your next ask goes out with this delivery window.</p>
            </div>
            <button className="btn o" style={{ padding: "7px 12px", fontSize: 12 }} onClick={() => setPickedWindow(null)}>
              Clear
            </button>
          </div>
        </div>
      )}
      <div className="card">
        <div className="row">
          <div className="ico t">🔄</div>
          <div>
            <h3>Picked up an extra shift?</h3>
            <p>Swap and Save adds a free errand bundle to that week, because covering for your team should not cost you your weekend.</p>
          </div>
        </div>
      </div>
      <div className="card">
        <div className="row">
          <div className="ico s">🔗</div>
          <div>
            <h3>Synced with your schedule</h3>
            <p>Work and personal calendars in one place. HOP fills the gaps. [CONFIRM which schedule apps to support]</p>
          </div>
        </div>
      </div>
      <p className="mock">Sample shift pattern until HOP connects to your unit schedule.</p>
    </>
  );
}
