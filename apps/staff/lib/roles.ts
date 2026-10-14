/*
 * Sample role content from the mockup's ROLES (staff-app.html). The name, job title and unit on
 * screen are always the signed-in member's own. Only the shift pattern, shift state and licence
 * name are sample, picked from the closest role to the job title. No "See it as" picker.
 * TODO(IT): replace with the unit scheduling system once a privacy review allows it.
 */

export type SampleRole = {
  id: "nurse" | "doctor" | "tech" | "home";
  shift: string;
  state: string;
  next: string;
  /** Mon..Sun, 1 = working that day. */
  pattern: number[];
  night: boolean;
  lic: string;
};

export const ROLES: Record<SampleRole["id"], SampleRole> = {
  nurse: { id: "nurse", shift: "Night shift", state: "Off today", next: "Fri 7:00 PM to Sat 7:30 AM", pattern: [0, 0, 1, 1, 0, 1, 0], night: true, lic: "RN license renewal" },
  doctor: { id: "doctor", shift: "Day shift", state: "On shift now", next: "Ends today 7:00 PM", pattern: [1, 1, 0, 0, 1, 1, 0], night: false, lic: "Medical license renewal" },
  tech: { id: "tech", shift: "Swing shift", state: "Off today", next: "Thu 3:00 PM to 11:30 PM", pattern: [0, 1, 1, 0, 1, 0, 0], night: false, lic: "ARRT certification" },
  home: { id: "home", shift: "Field visits", state: "On the road", next: "4 visits today, done by 5:30 PM", pattern: [1, 1, 1, 0, 1, 0, 0], night: false, lic: "HHA certification" }
};

/** Closest sample role for a free-text job title, falling back to "nurse". */
export function pickRole(jobTitle: string): SampleRole {
  const t = jobTitle.toLowerCase();
  if (/home health|aide|\bhha\b|caregiver|field/.test(t)) return ROLES.home;
  if (/doctor|physician|\bdr\b|\bmd\b|\bdo\b|resident|hospitalist|surgeon|attending|fellow|intern/.test(t)) return ROLES.doctor;
  if (/tech|imaging|radiolog|x-ray|\bmri\b|\bct\b|sonograph|ultrasound|\blab\b|phlebot|respirat|therapist|pharmac/.test(t)) return ROLES.tech;
  return ROLES.nurse;
}

/** Request categories (the shared JOB_CATS) with the mockup's compose-sheet copy. */
export const CATS = {
  ride: ["🚗", "Ride", "Commute, airport, anywhere"],
  food: ["🍱", "Food", "To your unit or break room"],
  errand: ["🧾", "Errand", "Pharmacy, dry cleaning, gifts"],
  delivery: ["📦", "Delivery", "Groceries, packages, drop offs"],
  family: ["🏡", "Family", "Childcare, pickups, big dates"],
  pet: ["🐕", "Pet", "Walks, feeding, vet runs"]
} as const;

export type Cat = keyof typeof CATS;

export const initials = (first: string, last: string) => `${first[0] ?? ""}${last[0] ?? ""}`.toUpperCase() || "H";

export function greet(d = new Date()) {
  const h = d.getHours();
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}
