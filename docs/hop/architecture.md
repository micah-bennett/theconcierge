# HOP — Architecture

Read this before adding a HOP feature. It describes how the app is actually wired today, not
how it might look eventually — check `mvp-scope.md` for what's real vs. stubbed.

## Stack

- **Frontend**: Vite + React 19 + TypeScript, client-side routed with `react-router-dom` v7
  (`src/App.tsx`). No CSS framework or component library — every page has hand-written CSS with
  BEM-ish class names (e.g. `hop-page`, `hop-service-card__ico`).
- **Backend**: Vercel Functions under `api/`, written as Web-standard handlers
  (`export async function POST(request: Request): Promise<Response>`), not Node
  `req`/`res` handlers. File-system routing: `api/foo.ts` → `/api/foo`.
  **Avoid dynamic segments** (`api/foo/[id].ts`): `vercel.json`'s SPA catch-all rewrite
  (`"/(.*)" -> "/index.html"`) wins over bracket routes in both `vercel dev` and real
  production on this project, so a request to `/api/foo/123` silently returns the SPA's
  `index.html` instead of hitting the function. Pass an `id`/`action` via a query string or
  the request body on a flat file instead (see `api/hop/auth.ts`'s `?action=` dispatch and
  `api/hop/requests.ts`'s body-based `PATCH`). This also matters for the Hobby-plan
  12-Serverless-Function cap — flat, multi-action files keep the function count down
  (currently 9 total: `chat.ts`, `requests.ts`, `relief.ts`, and 6 under `api/hop/**`).
- **Database**: Neon serverless Postgres via `@neondatabase/serverless`'s `neon()` tagged-template
  client. One schema file, `db/schema.sql`, written idempotently (`CREATE TABLE IF NOT EXISTS`,
  `ADD COLUMN IF NOT EXISTS`, etc.) and applied with `npm run db:migrate`.
- **Email**: Resend (`api/_lib/email.ts`), used today for the concierge-request notification
  flow. Not used by HOP auth (auth is email+password, not magic-link).
- **AI**: `api/chat.ts` calls the Anthropic API directly for the marketing site's chatbot. Unrelated
  to HOP's own AI plans ("HOP AI" chip is a future service category, not built yet).
- **Local dev**: `vite` alone does not serve `/api/*`; use `vercel dev` for anything that touches
  the API/DB, per `README.md`.

## Conventions used by existing API code (`api/requests.ts`, `api/chat.ts`)

- Validate the request DB URL / API key is configured before doing anything; return `503` if not.
- Validation lives in dedicated helpers under `api/_lib/` (e.g. `requestValidation.ts`), not
  inline in the handler.
- Errors: catch broadly, classify by message pattern into a 4xx or 500 status, `console.error`
  only on 500s (don't log expected validation failures).
- Responses always set `Cache-Control: no-store` on dynamic JSON.

HOP's own API code (`api/hop/**`, `api/_lib/hopDb.ts`, `api/_lib/hopAuth.ts`,
`api/_lib/googleCalendar.ts`) follows the same conventions but is kept separate from the
existing concierge-request/chat code — no shared modules were refactored to avoid touching
working, unrelated code.

## Where HOP's app lives in routing

- `/hop` — the existing marketing page (`src/pages/HopPage.tsx`), untouched except for a
  login/signup CTA in the hero.
- `/hop/login`, `/hop/signup`, `/hop/admin/login` — auth pages, public.
- `/hop/app/*` — authenticated **user** portal (`src/pages/hop/app/`), behind `RequireAuth`.
- `/hop/admin/*` — authenticated **admin** portal (`src/pages/hop/admin/`), behind `RequireAdmin`.

Auth state lives in `src/hop/AuthContext.tsx`, scoped to a layout route that wraps only the
`/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/app/*`, `/hop/admin/*` subtree — so
loading the marketing site (including plain `/hop`) never triggers a session check.

## Dashboard "sell" content (`src/hop/dashboard/`)

`HopDashboardPage.tsx` (`/hop/app`) has two parts: the functional top section (quick-request
tiles, calendar preview — unchanged since the original build) and, below it, a set of
componentized informational/"why HOP" sections: `HopWhyBanner`, `HopBurnoutStats`,
`HopHowItWorks`, `HopServicesOverview`, `HopFeatureHighlights`, `HopAboutStory`. These are ported
from a reverted public-homepage redesign (see `mvp-scope.md`) — reuse or extend them for any
"tell the user why HOP matters" content; don't rebuild similar content from scratch. Styled by
`src/styles/hopDashboard.css` (a `hop-dash-*` prefix, deliberately distinct from the core app's
`.hop-card`/`.hop-stat*` classes in `hopApp.css` to avoid collisions on the same page).

## Auth model

- Email + password. Passwords hashed with `bcryptjs` (`api/_lib/hopAuth.ts`).
- Sessions are DB-backed, not JWT: a random token (`crypto.randomBytes(32)`) is set in an
  httpOnly/Secure/SameSite=Lax cookie; only its SHA-256 hash (peppered with
  `SESSION_HASH_SECRET`) is stored in `hop_sessions`. This makes sessions individually
  revocable (needed for admin "disable user").
- Two roles, `user` and `admin`, on the same `hop_users` table — not separate tables. There is
  no self-serve admin signup; admin accounts are created with `scripts/create-hop-admin.mjs`.
- Basic brute-force protection: after 8 failed logins, an account locks for 15 minutes
  (`hop_users.failed_login_attempts` / `locked_until`). No IP-based rate limiting yet, and no
  password-reset flow yet — both are reasonable follow-ups, not built in this pass.

## Integrations model

- `hop_integrations` holds one row per (user, provider). `provider` is an open set today:
  `google_calendar`, `fitbit`, `oura`, `apple_health`, `garmin`.
- Only `google_calendar` is real: OAuth handled in `api/hop/integrations/google.ts` (one flat
  file, `?action=start|callback|disconnect|events`) using plain `fetch` against Google's OAuth2 +
  Calendar v3 REST endpoints (no `googleapis` SDK, to keep Vercel function bundles small).
- The other providers exist only so the UI (`HopIntegrationsPage.tsx`) can render a consistent
  "connect this" card per provider; their connect buttons are disabled ("Coming soon") and hit
  no API. `hop_wearable_metrics` exists in the schema but nothing writes to it yet.
