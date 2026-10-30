# HOP: Project Overview

**Start here.** This is the entry point for any agent picking up work on this repo. Read it
first, then follow the links to the doc for what you're touching. If something here contradicts
the code, trust the code and fix this doc.

## What this is

HOP (Hospitality On-Site Professionals) is run by Hudson Valley Concierge Service LLC. The brand
line is *"Radical Hospitality for the people who keep healthcare running."* This repo holds two
things:

1. **The public landing site** (`apps/site`). Routes: `/`, `/how-it-works`, `/professionals`,
   `/organizations`, `/concierge`, `/portal`, `/contact`. Old URLs redirect: `/personal-services`
   → `/concierge`, `/hop` → `/`, `/plans` → `/organizations`, `/request` → `/contact`.
   - `/portal` is the **"Choose your portal"** page. It has four cards that link to each Portal
     app's `/login`, with URLs taken from `VITE_*_URL` env vars. A card shows "Coming soon" when
     its URL is unset.
   - The only API is the contact form, `POST /api/inquiry`. It writes to `hop_inquiries` and
     emails the owner through Resend.
2. **The HOP Portal**: four apps that work together on one database.

   | App | Folder | Role | What it does |
   |---|---|---|---|
   | HOP Client | `apps/staff` | `staff` | Ask HOP for anything, Clutch, rewards, a profile that learns you. Self sign-up |
   | Concierge Console | `apps/console` | `console` | Sees every request, dispatches trips and tasks to one specific rep, tracks jobs, reviews proof, manages rep and facility accounts |
   | Concierge Rep App | `apps/rep` | `rep` | Sees only the jobs sent to them: accept, track, call, photo proof, signature, smart door |
   | Facility View | `apps/facility` | `facility_admin` | Unit heat map and Burnout Radar. Unit totals only, no names |

   The flow: HOP Client request → Console queue → Console dispatches a job to one rep → the rep
   works it in the Rep App → the Console sees updates live. Details are in
   `docs/portal/architecture.md`.

## History (read once, so you don't re-propose reversed work)

- **2026-10 rebuild (current).** Leadership sent a new concept: four apps, a Next.js starter and
  clickable mockups. The concept lives in `prototype/`. Everything from the old HOP system was
  removed:
  - the `/hop/*` member app and admin
  - the `staff-portal` branch, also known as "ConciergeHub"
  - the social feed, wellness, family care and Google Calendar integration
  - the marketing chatbot (`api/chat.ts`) and the concierge/relief request forms
  - the Capacitor iOS wrapper

  We are building **web first**. The old tables are still in Neon, unused (see `db/schema.sql`'s
  header). The repo became an npm-workspaces monorepo and the landing site moved from the repo
  root into `apps/site`.
- **2026-10 public site rebrand.** The landing site was rebuilt from a leadership mockup
  (`design/hop-mockup.html`), in both design and copy. HOP is the parent brand, and *The
  Concierge by HOP* is one page (`/concierge`). Removed on purpose: team photography,
  credentials row, chatbot widget, Plans and Personal Services pages. Don't add them back unless
  asked. The phone number was removed then, and came back on 2026-10-29 at the owner's request:
  845-912-SERV ((845) 912-7378), in a slim bar above the header, the footer and `/contact`. Change it in one place: `apps/site/src/site/contact.ts`.
- **2026-10-29 homepage carousel (owner directive, preview branch `feature/home-carousel`).**
  The homepage hero became a five-slide carousel (`apps/site/src/components/HomeCarousel.tsx`,
  styles under "Home carousel" in `hopSite.css`, photos in `apps/site/public/carousel/`). Photography
  is back on the homepage at the owner's request. The slide copy is the owner's, verbatim. The
  Healthcare slide links to `/organizations` until a Healthcare page exists, and slide 5 shows the
  three audience photos until the owner supplies the family photo. The old `.hs-hero` CSS is unused
  now and can be removed once the carousel ships.

## Stack

- **Landing site**: Vite + React 19 + TypeScript, `react-router-dom` v7, hand-written CSS
  (`apps/site/src/styles/hopSite.css`, scoped under `.hs`). Its API is a Vercel Function using
  Web-standard handlers: `export async function POST(request: Request): Promise<Response>`.
- **Portal apps**: Next.js (App Router, TypeScript), ported from `prototype/starter/`. API routes
  are App Router route handlers. Shared code is imported from `@hop/shared` (`packages/shared`),
  which each app compiles with `transpilePackages`.
- **Database**: one Neon Postgres database, accessed with `@neondatabase/serverless`. One schema
  file, `db/schema.sql`, written idempotently and applied with `npm run db:migrate` from the repo
  root.
- **Auth**: our own email+password auth (bcrypt, hashed session tokens in an httpOnly cookie, a
  per-app role check), in `packages/shared`. No third-party auth provider.
- **Email**: Resend.
- **Hosting**: Vercel Hobby plan, with five projects (one per `apps/*` folder). See
  `docs/portal/backend-guide.md`.

## Local dev

- `npm install` once at the repo root installs every workspace.
- Landing site: `npm run dev:site` (plain Vite). It doesn't serve `/api/inquiry`. To test the
  contact form, run `vercel dev` inside `apps/site` with `DATABASE_URL` set.
- Portal apps: `npm run dev -w @hop/console` (and likewise for the others) runs `next dev`, which
  serves both pages and API routes. They need `DATABASE_URL` and `SESSION_HASH_SECRET` in that
  app's `.env.local`. Give each app its own port (set in its `package.json`) so you can run the
  Console and Rep App side by side for the end-to-end test.

## Where to look next

- **Portal work**: `docs/portal/architecture.md`, then `docs/portal/mvp-scope.md`.
- **Building the next phase**: `docs/rebuild/README.md`.
- **Landing site pages** (`apps/site/src/pages/site/*`): see `docs/design-system.md` §1.
- **Fonts and colours, anywhere**: `docs/design-system.md`. The landing site and the Portal have
  separate token sets. Don't cross-contaminate them.
- **Non-engineer backend tasks** (env vars, migrations, first console account, deploying):
  `docs/portal/backend-guide.md`.
- **Regenerating the OG share card** (`apps/site/public/og-team.jpg`): the original is in
  `design/`. Run `npm run og:image -w @hop/site`. This is deliberately not part of the build.
