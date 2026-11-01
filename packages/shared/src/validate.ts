import { z } from "zod";
import { CONCIERGE_REQUEST_TYPES, JOB_CATS } from "./brand";

const safe = (max = 400) => z.string().max(max).transform((s) => s.replace(/[<>`]/g, ""));
/** Proof images: an inline data URL (demo) or a Vercel Blob URL. No other hosts. */
const img = z
  .string()
  .max(3_000_000)
  .refine((v) => /^(data:image\/(png|jpeg|webp);base64,|https:\/\/[a-z0-9-]+\.(public\.)?blob\.vercel-storage\.com\/)/.test(v), "Must be an image");
const entry = z.tuple([safe(40), safe(600)]);
const cat = z.enum(JOB_CATS);
const status = z.enum(["offer", "accepted", "started", "in_progress", "completed", "declined"]);

export const newJobSchema = z.object({
  rep: z.string().uuid(),
  cat,
  icon: safe(8),
  title: safe(140).pipe(z.string().min(1)),
  client: safe(80).pipe(z.string().min(1)),
  crole: safe(80).default("HOP member"),
  phone: safe(20).default(""),
  phoneTxt: safe(30).default(""),
  pickup: safe(200).default("See notes"),
  drop: safe(200).default("See notes"),
  window: safe(80).default("As soon as possible"),
  dist: safe(20).optional(),
  vendor: z.object({ name: safe(100), contact: safe(80), phone: safe(20), phoneTxt: safe(30) }).nullable().default(null),
  items: z.array(safe(200)).max(30).default([]),
  notes: safe(1000).default(""),
  prefs: z.array(safe(100)).max(15).default([]),
  door: z.object({ kind: safe(80), state: z.literal("idle") }).nullable().default(null),
  needPhoto: z.boolean().default(true),
  needSig: z.boolean().default(false),
  sentAt: safe(20).optional(),
  requestId: safe(40).optional()
});

/**
 * Fields a rep may change on their own job. No reassigning, no editing what was asked, and no door
 * state: the member approves door access in HOP Client, and doors change only through setDoorState().
 */
const repFields = {
  status,
  log: z.array(entry).max(200),
  updates: z.array(entry).max(300),
  photos: z.array(img).max(6),
  sig: img.nullable(),
  signedBy: safe(80).nullable(),
  notesList: z.array(safe(600)).max(100),
  done: z.record(z.boolean()),
  attn: z.object({ r: safe(80), n: safe(600).optional() }).nullable(),
  share: z.boolean()
};

export const repPatchJobSchema = z.object(repFields).partial().strict();

/** Console may also reassign. Proof (photos, signature) stays rep-only. */
export const consolePatchJobSchema = z
  .object({
    rep: z.string().uuid(),
    status,
    log: repFields.log,
    notesList: repFields.notesList,
    attn: repFields.attn
  })
  .partial()
  .strict();

/** Forward-only status moves a rep may make. */
export const REP_STATUS_MOVES: Record<string, string[]> = {
  offer: ["accepted", "declined"],
  accepted: ["started"],
  started: ["in_progress"],
  in_progress: ["completed"]
};

export const newRequestSchema = z.object({
  cat,
  text: safe(400).pipe(z.string().min(1)),
  urgent: z.boolean().optional(),
  window: safe(80).optional(),
  source: z.enum(["ask", "clutch", "rescue", "voice", "chat", "welcome", "life"]).default("ask")
});

const email = z.string().trim().toLowerCase().email().max(200);
const password = z.string().min(10, "Use at least 10 characters").max(200);
const name = z.string().trim().min(1).max(60).transform((s) => s.replace(/[<>`]/g, ""));

export const loginSchema = z.object({ email, password: z.string().min(1).max(200) });

export const signupSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
  phone: z.string().trim().max(30).default(""),
  jobTitle: safe(80).pipe(z.string().min(1)),
  facilityId: z.string().uuid(),
  unitId: z.string().uuid(),
  consent: z.literal(true)
});

/** Concierge Portal self sign-up: no facility, unit or job title. */
export const customerSignupSchema = z.object({
  email,
  password,
  firstName: name,
  lastName: name,
  phone: z.string().trim().min(7, "Enter a phone number we can reach you on").max(30),
  consent: z.literal(true)
});

const zip = z.string().trim().regex(/^(\d{5}(-\d{4})?)?$/, "Enter a 5-digit ZIP code");
const addressSchema = z.object({
  line1: safe(160).default(""),
  line2: safe(160).default(""),
  city: safe(80).default(""),
  state: safe(60).default(""),
  zip: zip.default("")
});

const flightSchema = z.object({
  airline: safe(60).default(""),
  flightNumber: safe(20).default(""),
  airport: safe(80).default(""),
  direction: z.enum(["departure", "arrival", ""]).default(""),
  time: safe(20).default(""),
  passengers: safe(10).default(""),
  bags: safe(10).default("")
});

const paymentSchema = z
  .object({
    method: z.enum(["", "card", "phone", "invoice", "other"]).default(""),
    cardholderName: safe(80).default(""),
    cardLast4: z.string().trim().regex(/^(\d{4})?$/, "Enter only the last 4 digits of the card").default("")
  })
  // Card details only travel with the card method.
  .transform((p) => (p.method === "card" ? p : { ...p, cardholderName: "", cardLast4: "" }));

/** The fields shared by a Concierge Portal request and an instant request (see ConciergeDetails). */
export const conciergeDetailsSchema = z.object({
  requestType: z.enum(CONCIERGE_REQUEST_TYPES),
  dateNeeded: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick the date you need this done"),
  timeNeeded: safe(20).default(""),
  address: addressSchema.default({}),
  flight: flightSchema.nullable().default(null),
  payment: paymentSchema.default({}),
  hearAboutUs: safe(60).default("")
});

/** POST /api/requests on the Concierge Portal. */
export const conciergeRequestSchema = conciergeDetailsSchema.extend({
  text: safe(2000).pipe(z.string().trim().min(1, "Tell us what you need")),
  urgent: z.boolean().optional()
});

export const setPasswordSchema = z.object({ token: z.string().min(20).max(200), password });

export const forgotSchema = z.object({ email });

export const inviteSchema = z
  .object({
    email,
    firstName: name,
    lastName: name,
    phone: z.string().trim().max(30).default(""),
    role: z.enum(["rep", "console", "facility_admin"]),
    facilityId: z.string().uuid().nullable().default(null)
  })
  .refine((v) => v.role !== "facility_admin" || !!v.facilityId, { message: "Pick a facility", path: ["facilityId"] })
  // Only facility admins belong to a facility.
  .transform((v) => (v.role === "facility_admin" ? v : { ...v, facilityId: null }));

export const messageSchema = z.object({ body: safe(1000).pipe(z.string().trim().min(1, "Write a message")) });
