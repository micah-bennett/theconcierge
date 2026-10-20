import type { ShiftPattern } from "./types";

/*
 * Everything about shifts is derived from the member's own pattern (You → Your shifts, saved in
 * portal_staff_profiles.shift_pattern). Days are Mon = 0 … Sun = 6, times "HH:MM" local.
 */

export const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const toMin = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};

/** "07:00" → "7:00 AM". */
export function fmtTime(t: string | number): string {
  const min = typeof t === "number" ? t : toMin(t);
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

/** Hours as a compact label for windows: 15 → "3 PM", 15.5 → "3:30 PM". */
function fmtHour(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh % 12 || 12}${mm ? `:${String(mm).padStart(2, "0")}` : ""} ${hh < 12 ? "AM" : "PM"}`;
}

export const overnight = (p: ShiftPattern) => toMin(p.end) <= toMin(p.start);
export const dayIdx = (d: Date) => (d.getDay() + 6) % 7;

/** The shift bar on Today. */
export function shiftNow(p: ShiftPattern, now = new Date()): { label: string; state: string; meta: string; progress: number } {
  const label = p.night ? "Night shift" : "Your shift";
  const t = now.getHours() * 60 + now.getMinutes();
  const today = dayIdx(now);
  const yesterday = (today + 6) % 7;
  const s = toMin(p.start);
  const e = toMin(p.end);
  const over = overnight(p);
  const len = over ? 1440 - s + e : e - s;
  const range = `${fmtTime(p.start)} to ${fmtTime(p.end)}`;
  if (!p.days.length) return { label, state: "No shift days set", meta: "Add your days in You → Your shifts", progress: 0 };
  if (over && p.days.includes(yesterday) && t < e) {
    return { label, state: "On shift now", meta: `Ends today ${fmtTime(p.end)}`, progress: Math.round(((1440 - s + t) / len) * 100) };
  }
  if (p.days.includes(today)) {
    if (t >= s && (over || t < e)) return { label, state: "On shift now", meta: `Ends ${over ? "tomorrow " : ""}${fmtTime(p.end)}`, progress: Math.round(((t - s) / len) * 100) };
    if (t < s) return { label, state: "On today", meta: `Today ${range}`, progress: 0 };
  }
  for (let k = 1; k <= 7; k++) {
    const d = (today + k) % 7;
    if (p.days.includes(d)) {
      return { label, state: p.days.includes(today) ? "Done for today" : "Off today", meta: `Next shift ${k === 1 ? "tomorrow" : DAY_SHORT[d]} ${fmtTime(p.start)}`, progress: 0 };
    }
  }
  return { label, state: "Off today", meta: range, progress: 0 };
}

export type Block = { kind: "shift" | "rest" | "win"; from: number; to: number; text: string };

/**
 * The Week timeline for one day (Mon = 0), hours 6 to 22: shift blocks from the pattern, a rest
 * block after a night shift, and up to two 2 hour delivery windows in the time that's left.
 */
export function dayBlocks(p: ShiftPattern | null, d: number): Block[] {
  const blocks: Block[] = [];
  const busy: [number, number][] = [];
  if (p) {
    const s = toMin(p.start) / 60;
    const e = toMin(p.end) / 60;
    const over = overnight(p);
    const prev = (d + 6) % 7;
    if (over && p.days.includes(prev)) {
      blocks.push({ kind: "shift", from: 6, to: Math.max(6.5, e), text: `Shift ends ${fmtTime(p.end)}` });
      busy.push([0, e]);
      const restTo = Math.min(22, e + 7);
      blocks.push({ kind: "rest", from: e + 0.5, to: restTo, text: "Rest after your night shift" });
      busy.push([e, restTo]);
    }
    if (p.days.includes(d)) {
      const to = over ? 22 : e;
      blocks.push({ kind: "shift", from: Math.max(6, s), to: Math.min(22, Math.max(s + 0.5, to)), text: `Shift ${fmtTime(p.start)} to ${fmtTime(p.end)}` });
      busy.push([s - 1, over ? 24 : e + 0.5]);
    }
  }
  // Free time between 8 AM and 10 PM, on the half hour, keeping clear of each shift.
  const wins: [number, number][] = [];
  for (let h = 8; h + 2 <= 22 && wins.length < 2; h += 0.5) {
    const clash = busy.some(([a, b]) => h < b && h + 2 > a);
    const near = wins.some(([a, b]) => h < b + 2 && h + 2 > a - 2);
    if (!clash && !near) wins.push([h, h + 2]);
  }
  for (const [a, b] of wins) blocks.push({ kind: "win", from: a, to: b, text: `${fmtHour(a).replace(/ (AM|PM)$/, a < 12 === b < 12 ? "" : " $1")} to ${fmtHour(b)}` });
  return blocks;
}
