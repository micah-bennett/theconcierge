"use client";
import { useState } from "react";
import { usePhone } from "@hop/shared/ui/Phone";
import { DAY_SHORT, dayBlocks, dayIdx } from "@/lib/shift";
import { ComingSoon } from "../bits";
import { useStaff } from "../store";

const D = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * My Week: the member's own shift pattern (saved in You) with open delivery windows around it.
 * Picking a window attaches it to the member's next request. No pattern → a prompt to add one.
 */
export function Week() {
  const { me, go, pickedWindow, setPickedWindow } = useStaff();
  const { toast } = usePhone();
  const now = new Date();
  const todayIdx = dayIdx(now);
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - todayIdx);
  const dates = D.map((_, i) => new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i));
  const [day, setDay] = useState(todayIdx);
  const shift = me?.shift ?? null;
  const y = (h: number) => (h - 6) * 15 + 12;
  const hrs: number[] = [];
  for (let h = 6; h <= 22; h += 2) hrs.push(h);
  const blocks = dayBlocks(shift, day);

  return (
    <>
      <div className="hello disp">My Week</div>
      <div className="sub">HOP plans deliveries around the shifts you tell it about.</div>
      {me && !shift && (
        <div className="card" style={{ background: "var(--soft-sky)", borderColor: "#cfe3f7" }}>
          <div className="row">
            <div className="ico" style={{ background: "#fff" }}>🗓️</div>
            <div>
              <h3>Add your shifts</h3>
              <p>Save your usual days and hours in You. Your week fills in here.</p>
            </div>
          </div>
          <button className="btn n w" style={{ marginTop: 12 }} onClick={() => go("you")}>
            Add my shifts
          </button>
        </div>
      )}
      <div className="week">
        {D.map((d, i) => (
          <div key={i} className={`day ${i === day ? "on" : ""}`} role="button" onClick={() => setDay(i)}>
            <small>{d}</small>
            <b>{dates[i].getDate()}</b>
            <i style={{ background: shift?.days.includes(i) ? "var(--sky)" : "transparent" }} />
          </div>
        ))}
      </div>
      <div className="row" style={{ gap: 14, margin: "0 2px 10px", fontSize: 12, color: "var(--muted)" }}>
        <span>▧ Shift</span>
        <span style={{ color: "#037e80" }}>▢ Open for delivery</span>
        {shift?.night && <span style={{ color: "#5a4a9a" }}>■ Rest</span>}
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
        {blocks.map((b) => {
          const style = { top: y(b.from), height: Math.max(22, (b.to - b.from) * 15) };
          if (b.kind !== "win") return <div key={b.text + b.from} className={`blk ${b.kind === "shift" ? "shift" : "sleep"}`} style={style}>{b.text}</div>;
          const l = `${DAY_SHORT[day]} ${dates[day].getDate()}, ${b.text}`;
          return (
            <div
              key={b.text}
              className={`blk win ${pickedWindow === l ? "picked" : ""}`}
              style={{ ...style, height: 30 }}
              role="button"
              onClick={() => {
                setPickedWindow(l);
                toast(`Delivery set for ${b.text}. Your next request will use it.`);
              }}
            >
              {b.text} · open
            </div>
          );
        })}
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
      {shift && (
        <button className="btn o w" style={{ marginBottom: 12 }} onClick={() => go("you")}>
          Change my shifts
        </button>
      )}
      <ComingSoon feature="calendar-sync" icon="🔗" text="Bring your work schedule and personal calendars into HOP, so it fills the gaps without you typing your shifts. [CONFIRM which schedule apps to support]" />
    </>
  );
}
