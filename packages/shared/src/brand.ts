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

/** Which Portal app each role signs in to. Used for the "wrong app" message on login. */
export const APP_FOR_ROLE = {
  staff: { name: "Staff App", envKey: "STAFF_URL" },
  console: { name: "Concierge Console", envKey: "CONSOLE_URL" },
  rep: { name: "Concierge Rep App", envKey: "REP_URL" },
  facility_admin: { name: "Facility View", envKey: "FACILITY_URL" }
} as const;

/**
 * Facility View privacy floor: any unit or cell built from fewer people than this is suppressed
 * server side, never sent to the browser. [CONFIRM with counsel]
 */
export const MIN_GROUP_SIZE = 5;
