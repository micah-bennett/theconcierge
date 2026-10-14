import { z } from "zod";
import { JOB_CATS } from "./brand";

const safe = (max = 400) => z.string().max(max).transform((s) => s.replace(/[<>`]/g, ""));
/** Proof images: an inline data URL (demo) or a Vercel Blob URL. No other hosts. */
const img = z
  .string()
  .max(3_000_000)
  .refine((v) => /^(data:image\/(png|jpeg|webp);base64,|https:\/\/[a-z0-9-]+\.(public\.)?blob\.vercel-storage\.com\/)/.test(v), "Must be an image");
const entry = z.tuple([safe(40), safe(600)]);
const cat = z.enum(JOB_CATS);
const status = z.enum(["offer", "accepted", "started", "in_progress", "completed", "declined"]);
const door = z
  .object({ kind: safe(80), state: z.enum(["idle", "asked", "ok", "open", "closed"]), log: z.array(entry).max(100).optional() })
  .nullable();

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

/** Fields a rep may change on their own job. No reassigning, no editing what was asked. */
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
  share: z.boolean(),
  door
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
