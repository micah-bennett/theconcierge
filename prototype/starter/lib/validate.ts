import { z } from "zod";
import { REPS } from "./brand";

const repIds = REPS.map((r) => r.id) as [string, ...string[]];
const safe = (max = 400) => z.string().max(max).transform((s) => s.replace(/[<>`]/g, ""));
const img = z.string().max(3_000_000).refine((v) => /^(data:image\/(png|jpeg|webp);base64,|https:\/\/)/.test(v), "Must be an image");
const entry = z.tuple([safe(40), safe(600)]);

export const newJobSchema = z.object({
  rep: z.enum(repIds),
  cat: z.enum(["ride", "delivery", "errand", "food", "family", "pet"]),
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

export const patchJobSchema = z
  .object({
    rep: z.enum(repIds),
    status: z.enum(["offer", "accepted", "started", "in_progress", "completed", "declined"]),
    log: z.array(entry).max(200),
    updates: z.array(entry).max(300),
    photos: z.array(img).max(6),
    sig: img.nullable(),
    signedBy: safe(80).nullable(),
    notesList: z.array(safe(600)).max(100),
    done: z.record(z.boolean()),
    attn: z.object({ r: safe(80), n: safe(600).optional() }).nullable(),
    share: z.boolean(),
    door: z
      .object({ kind: safe(80), state: z.enum(["idle", "asked", "ok", "open", "closed"]), log: z.array(entry).max(100).optional() })
      .nullable()
  })
  .partial();

export const newRequestSchema = z.object({
  member: safe(80).pipe(z.string().min(1)),
  role: safe(80),
  cat: z.enum(["ride", "delivery", "errand", "food", "family", "pet"]),
  text: safe(400).pipe(z.string().min(1))
});
