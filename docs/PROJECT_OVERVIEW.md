# The Concierge — Project Overview

**Start here.** This is the entry point for any agent picking up work on this repo. Read this
first, then follow the links below to the doc relevant to what you're touching. Don't assume —
this file and its linked docs are kept current; if something here contradicts what you read in
the code, trust the code and fix the doc.

## What this is

Two products under one company (Hudson Valley Concierge Service LLC), one codebase, one deploy:

1. **The Concierge (public marketing site)** — general-audience concierge service marketing
   (transportation, errands, lifestyle concierge, healthcare logistics) for individuals, families,
   businesses, and seniors in the Hudson Valley, NY. Routes: `/`, `/personal-services`, `/hop`
   (HOP's own marketing page), `/plans`, `/contact`, `/request` (a request-form modal).
2. **HOP** — a login-gated product for healthcare staff (concierge requests, calendar
   integration, wearables-to-come) with its own user portal and admin portal. Routes:
   `/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/app/*` (authenticated user),
   `/hop/admin/*` (authenticated admin). See `docs/hop/` for everything HOP-specific.

**Important history**: an earlier pass rebuilt the entire public marketing site (new fonts,
colors, one-page structure, healthcare-focused copy) based on a leadership-provided prototype.
Leadership then decided that redesign's content actually belonged in HOP's post-login experience,
not on the general-audience homepage — so the public site was reverted to its original design,
and the redesign's sections were componentized into `src/hop/dashboard/` and appended to the HOP
dashboard instead (see `docs/hop/mvp-scope.md` for exactly what that looks like today). **Do not
re-propose moving that content back to the public homepage** unless explicitly asked — that
exact idea was tried and reversed.

**2026-09 — team-forward rebrand (public marketing site only).** Leadership repositioned the
brand away from centring the owner: *"pull away from making me the face … when we hyper focus on
me it makes it small and singular"*, and asked to separate the brand from HVCS. What changed:

- The homepage hero was a full-body **solo portrait of the owner** (`hero-home.png`). It is now
  full-bleed team photography (`public/hero-team-*.webp`, source in `design/`). `hero-home.png`
  and `hero-concierge.png` are retired — still on disk, referenced by nothing. The owner is still
  present: he is the centre figure in both team photos.
- A shared `TeamBand` component (`src/components/TeamBand.tsx`) now appears on the homepage and
  every inner marketing page. **This is the point of the rebrand** — don't strip it out.
- The **HVCS** tab and its outbound `hvconcierge.com` link were removed from the header. The
  parent entity is now named in exactly one place: the footer legal line. This was a deliberate
  brand decision, not an oversight — don't "restore" the nav link.
- The site gained an actual brand system (navy + champagne `--tc-*` tokens), a real mobile nav
  drawer, a four-column footer, Open Graph tags and per-route titles. See
  `docs/design-system.md` §1a–1d.
- `.hop-page`'s ~760 lines moved out of `App.css` into `src/styles/hopMarketing.css`, and that
  page's **chrome** (ground, surface, section rhythm, hairlines, radii, eyebrow) moved onto the
  `--tc-*` scale. Its indigo/violet **accent** is kept on purpose — see `docs/design-system.md`
  §1c.
- **Personal Services** got a real hero (Playfair display title, champagne eyebrow) and card
  headings of its own instead of borrowing Plans' uppercase label and pill classes, plus a
  three-up grid. The old "spotlight" card was folded into the hero lead.

This is a visual/brand change to the **public marketing site only** — it did not move any HOP
content onto the public pages, and the authenticated HOP app was not touched.

## Stack

- **Frontend**: Vite + React 19 + TypeScript, `react-router-dom` v7, no CSS framework (hand-written
  CSS, BEM-ish class names). See `docs/design-system.md` for fonts/colors/conventions.
- **Backend**: Vercel Functions under `api/`, written as Web-standard handlers
  (`export async function POST(request: Request): Promise<Response>`), not Node `req`/`res`.
  File-system routing: `api/foo.ts` → `/api/foo`. **Avoid dynamic route segments**
  (`api/foo/[id].ts`) — see the gotcha in `docs/hop/architecture.md`, it silently loses to the SPA
  rewrite in both `vercel dev` and production. Use a flat file with a query string or body field
  instead.
- **Database**: Neon serverless Postgres via `@neondatabase/serverless`. One schema file,
  `db/schema.sql`, written idempotently and applied with `npm run db:migrate`.
- **Email**: Resend (`api/_lib/email.ts` + `api/_lib/emailTemplates/`).
- **AI**: `api/chat.ts` calls the Anthropic API directly for the marketing site's chatbot widget.
- **Mobile**: Capacitor iOS wraps the same `dist/` build (see "Two build modes" below).
- **Hosting**: Vercel (Hobby plan — **12 Serverless Function cap per project**; see
  `docs/hop/architecture.md` → "Deployments" for the current per-project count before adding a
  new top-level `api/*.ts` file — don't trust a hardcoded number here, it goes stale fast).

## Two build modes (don't skip this)

`npm run build` produces the **web** build (absolute asset paths, required for Vercel to
deep-link into nested routes like `/hop/login`). `npm run cap:sync` produces a **separate** build
with `--base=./` (relative paths, required for the Capacitor iOS bundle) before running
`cap sync`. Do not merge these or remove the `--base=./` override — see the commit "Fix broken
deep-linking into nested routes on the web deployment" for why both exist.

## Local dev

- `npm run dev` — plain Vite, fine for anything that doesn't touch `/api/*`.
- `vercel dev` — required for `/api/*` routes (needs `DATABASE_URL` in env). **Known limitation**:
  in this project's `vercel dev`, directly loading (or Playwright `page.goto`-ing) a nested route
  URL sometimes 500s trying to parse `index.html` as a JS module, or falls through to the SPA
  shell for dynamic API routes. This is a local dev-server/proxy quirk, not a code bug — it does
  not reproduce in the actual production build. When verifying nested routes, either navigate via
  real in-page link clicks (not fresh `goto`s) or verify against a deployed preview/production URL.

## Where to look next

- **Working on HOP** (login, app, admin, integrations, the dashboard's "why HOP" content): read
  `docs/hop/vision.md`, `docs/hop/architecture.md`, `docs/hop/mvp-scope.md` in that order.
- **Planning new HOP work**: `docs/hop/roadmap.md` has the phased technical design for what's
  next (Facility portal, member social feed, rewards, family profiles) — check it before
  designing a feature from scratch.
- **Working on the public marketing site** (Home, Personal Services, Plans, Contact): read
  `docs/design-system.md` for the visual conventions; the pages are otherwise plain React
  components with no special architecture — read the component code directly.
- **Fonts/colors/buttons, on any page**: `docs/design-system.md` is the single source of truth.
  Three independent design systems coexist (public marketing site, the `/hop` marketing page, and
  the authenticated HOP app) — don't cross-contaminate them.
- **Re-generating the brand photography**: originals live in `design/`; run
  `node scripts/optimize-brand-photos.mjs` to rebuild the `public/*.webp` derivatives and the OG
  card. It is deliberately not part of `npm run build`.
- **Deploying**: `docs/vercel-setup.md`.
- **Non-engineer backend tasks** (env vars, migrations, creating accounts, deploying):
  `docs/hop/backend-guide.md`.
