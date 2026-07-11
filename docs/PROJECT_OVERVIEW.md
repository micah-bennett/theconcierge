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
- **Hosting**: Vercel (Hobby plan — **12 Serverless Function cap**, currently at 9; see
  `docs/hop/architecture.md` before adding a new top-level `api/*.ts` file).

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
- **Working on the public marketing site** (Home, Personal Services, Plans, Contact): read
  `docs/design-system.md` for the visual conventions; the pages are otherwise plain React
  components with no special architecture — read the component code directly.
- **Fonts/colors/buttons, on any page**: `docs/design-system.md` is the single source of truth.
  Two independent design systems coexist (public site vs. HOP app) — don't cross-contaminate them.
- **Deploying**: `docs/vercel-setup.md`.
