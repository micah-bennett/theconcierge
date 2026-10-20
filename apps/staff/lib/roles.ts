/*
 * Request categories and small display helpers. The name, job title, unit and shifts on screen are
 * always the signed-in member's own (shifts: lib/shift.ts, from their saved pattern).
 */

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
