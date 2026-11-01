import type { ConciergeDetails } from "./types";
/** HOP brand tokens. Keep in sync with :root in styles/portal.css. */
export const brand = {
  name: "HOP",
  fullName: "Hospitality On-Site Professionals",
  line: "Radical Hospitality for the people who keep healthcare running.",
  promise: "You take care of everyone else. We take care of the errands.",
  colors: {
    navy: "#012f6c",
    teal: "#04a6a8",
    sky: "#4ea1e3",
    cream: "#f7f4ee",
    gold: "#e8a93a",
    coral: "#e8625a",
    ink: "#14213a",
    muted: "#5d6b82"
  },
  fonts: { display: "Montserrat", body: "DM Sans" }
} as const;

export const JOB_CATS = ["ride", "delivery", "errand", "food", "family", "pet"] as const;

export const JOB_TYPES = [
  ["ride", "🚗", "Trip or ride"],
  ["delivery", "📦", "Delivery"],
  ["errand", "🧾", "Errand"],
  ["food", "🍱", "Food"],
  ["family", "🧒", "Family or kid pickup"],
  ["pet", "🐕", "Pet care"]
] as const;

export const STATUS_LABEL: Record<string, string> = {
  offer: "New offer",
  accepted: "Accepted",
  started: "Started",
  in_progress: "In progress",
  completed: "Completed",
  declined: "Passed"
};

/**
 * Which Portal app each role signs in to. Used for the "wrong app" message on login and invite links.
 * The staff app is branded "HOP Client". Its URL env is CLIENT_URL (STAFF_URL is read as a fallback).
 */
export const APP_FOR_ROLE = {
  staff: { name: "HOP Client", envKey: "CLIENT_URL" },
  console: { name: "Concierge Console", envKey: "CONSOLE_URL" },
  rep: { name: "Concierge Rep App", envKey: "REP_URL" },
  facility_admin: { name: "Facility View", envKey: "FACILITY_URL" },
  customer: { name: "Concierge Portal", envKey: "CONCIERGE_URL" }
} as const;

/**
 * Request types on the Concierge Portal and the public instant-request form. The first eight are the
 * original HOP concierge form's list; "Airport or flight travel" opens the flight fields.
 * Keep in sync with apps/site/src/site/conciergeRequest.ts (the public site can't import this package).
 */
export const CONCIERGE_REQUEST_TYPES = [
  "Personal errands & task management",
  "Scheduling & appointments",
  "Lifestyle & home assistance",
  "Airport or flight travel",
  "Member-rate concierge services",
  "Priority scheduling & travel coordination",
  "Ongoing professional support",
  "VIP / full-service concierge",
  "Other (describe below)"
] as const;

/** Request types that show the flight fields. */
export const FLIGHT_REQUEST_TYPES: readonly string[] = ["Airport or flight travel", "Priority scheduling & travel coordination"];

export const PAYMENT_METHODS = [
  ["", "Skip for now (payment optional)"],
  ["card", "Credit card"],
  ["phone", "Pay by phone"],
  ["invoice", "Invoice"],
  ["other", "Other"]
] as const;

export const HEAR_ABOUT_US = ["Word of mouth", "Referral", "Search / web", "Social media", "Event or partner", "My employer", "Other"] as const;

/** The JOB_CATS bucket a concierge request type maps to (so it dispatches like any other request). */
export function catForRequestType(type: string): (typeof JOB_CATS)[number] {
  if (/airport|flight|travel/i.test(type)) return "ride";
  if (/home|lifestyle/i.test(type)) return "family";
  return "errand";
}

/**
 * Facility View privacy floor: any unit or cell built from fewer people than this is suppressed
 * server side, never sent to the browser. [CONFIRM with counsel]
 */
export const MIN_GROUP_SIZE = 5;

/** Base URL of the app a role signs in to, from env. STAFF_URL is the pre-rename name of CLIENT_URL. */
export function appUrlFor(role: keyof typeof APP_FOR_ROLE): string | null {
  const env = process.env[APP_FOR_ROLE[role].envKey] || (role === "staff" ? process.env.STAFF_URL : undefined);
  return env?.trim().replace(/\/$/, "") || null;
}

const PAYMENT_LABEL: Record<string, string> = Object.fromEntries(PAYMENT_METHODS);

/**
 * A concierge/instant request's details as label/value rows (Console detail panel, job notes, emails).
 * Payment is only included when asked for: the Console sees it, a rep's job notes never do.
 */
export function conciergeSummary(d: ConciergeDetails, opts: { payment?: boolean; contact?: boolean } = {}): [string, string][] {
  const rows: [string, string][] = [["Request type", d.requestType]];
  rows.push(["Needed", [d.dateNeeded, d.timeNeeded].filter(Boolean).join(" at ") || "Any time"]);
  const a = d.address;
  const addr = [a.line1, a.line2, [a.city, a.state].filter(Boolean).join(", "), a.zip].filter(Boolean).join(", ");
  if (addr) rows.push(["Address", addr]);
  if (d.flight) {
    const f = d.flight;
    const dir = f.direction === "departure" ? "Departing" : f.direction === "arrival" ? "Arriving" : "";
    const flight = [dir, [f.airline, f.flightNumber].filter(Boolean).join(" "), f.airport && `at ${f.airport}`, f.time && `· ${f.time}`]
      .filter(Boolean)
      .join(" ");
    if (flight) rows.push(["Flight", flight]);
    const party = [f.passengers && `${f.passengers} passenger(s)`, f.bags && `${f.bags} bag(s)`].filter(Boolean).join(", ");
    if (party) rows.push(["Party", party]);
  }
  if (opts.contact && d.contact) {
    const c = d.contact;
    rows.push(["Contact", [`${c.firstName} ${c.lastName}`.trim(), c.phone, c.email].filter(Boolean).join(" · ")]);
  }
  if (opts.payment) {
    const p = d.payment;
    const method = PAYMENT_LABEL[p.method] ?? p.method;
    rows.push(["Payment", p.method === "card" ? `Credit card${p.cardholderName ? `, ${p.cardholderName}` : ""}${p.cardLast4 ? ` (ending ${p.cardLast4})` : ""} — take the full number by phone` : method]);
  }
  if (d.hearAboutUs) rows.push(["Heard about HOP", d.hearAboutUs]);
  return rows;
}
