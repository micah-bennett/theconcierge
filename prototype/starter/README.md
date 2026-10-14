# HOP Portal starter

Radical Hospitality for the people who keep healthcare running.

This is the starter codebase for the four HOP Portal apps, built in Next.js (App Router, TypeScript) and ready to deploy on Vercel. It matches the approved concept mockups: same brand colors, fonts, layouts, and flows. Every screen is a concept and uses sample data. Nothing here is live yet.

| App | Route | Who uses it |
|---|---|---|
| Staff App | `/staff` | Nurses, doctors, and every healthcare professional, in and out of the hospital |
| Concierge Console | `/console` | HOP dispatch team: staff request queue, dispatch to reps, live job tracking, proof review |
| Concierge Rep App | `/rep` | HOP field reps: accept jobs, client and vendor details, tracking, proof, smart door access |
| Facility View | `/facility` | Hospital leaders: unit heat map and Burnout Radar (unit totals only) |

The original clickable mockups are in `docs/mockups/` for reference. Open them in a browser to see every planned feature.

## Quick start

```bash
npm install
cp .env.example .env.local   # all keys optional for the demo
npm run dev                  # http://localhost:3000
```

With no environment variables the app uses an in-memory demo store, so you can click through everything immediately.

## How the apps connect

```
Staff App  --POST /api/requests-->  Concierge Console queue
Concierge Console  --POST /api/jobs (rep: "andre")-->  only Andre sees it in the Rep App
Rep App  --PATCH /api/jobs/:id (status, updates, photo, signature, door)-->  Console updates live
```

- `GET /api/jobs?rep=<id>` returns only that rep's jobs. The console calls `GET /api/jobs` for everything.
- The client polls every 4 seconds (`lib/client.ts`). Swap in Server-Sent Events, Pusher, Ably, or Supabase Realtime for production.
- Photos and signatures go through `POST /api/uploads`, which stores them in Vercel Blob when `BLOB_READ_WRITE_TOKEN` is set.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel (framework preset: Next.js).
2. Add a Postgres database (Vercel Postgres, Neon, or Supabase) and set `DATABASE_URL`.
3. Run `npm run db:schema` once to create the tables in `db/schema.sql`.
4. Add a Vercel Blob store and set `BLOB_READ_WRITE_TOKEN`.
5. Deploy. The in-memory store is for demos only and does not share data across serverless instances, so set `DATABASE_URL` before anyone else uses it.

## Project map

```
app/                 routes: /, /staff, /console, /rep, /facility, and /api/*
components/ui/       AppHeader, Phone frame (tabs, sheet, toast), StatusSteps, SignaturePad
components/staff     Staff App screens (Today, Rewards, HOP knows you, Smart home)
components/console   Concierge Console (request queue, dispatch table, composer)
components/rep       Concierge Rep App (jobs, job detail, proof, door, inbox, profile)
components/facility  Facility View (heat map, Burnout Radar)
lib/brand.ts         brand tokens, reps list, job types
lib/types.ts         Job, StaffRequest, Rep types
lib/validate.ts      zod schemas for every API input
lib/store/           memory store (demo) and Postgres store (DATABASE_URL)
lib/integrations/    Twilio (masked calls), Seam (smart locks), push alerts. Stubs with TODOs.
db/schema.sql        Postgres tables
docs/HANDOFF.md      what to build next, in order
docs/BRAND.md        brand rules for every screen
docs/mockups/        original concept mockups
```

Search the code for `TODO(IT)` to find every place that needs a real service, and `[CONFIRM]` for open business decisions.
