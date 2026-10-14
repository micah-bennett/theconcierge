/** HOP brand tokens. Keep in sync with :root in app/globals.css. */
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

export const REPS = [
  { id: "renee", name: "Renee Carter", first: "Renee", initials: "RC" },
  { id: "marcus", name: "Marcus Diaz", first: "Marcus", initials: "MD" },
  { id: "andre", name: "Andre Wells", first: "Andre", initials: "AW" }
] as const;

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
