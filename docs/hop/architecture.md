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
- `/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/forgot-password`, `/hop/reset-password`
  — auth pages, public.
- `/hop/app/*` — authenticated **user** portal (`src/pages/hop/app/`), behind `RequireAuth`.
- `/hop/admin/*` — authenticated **admin** portal (`src/pages/hop/admin/`), behind `RequireAdmin`.

Auth state lives in `src/hop/AuthContext.tsx`, scoped to a layout route that wraps only the
`/hop/login`, `/hop/signup`, `/hop/admin/login`, `/hop/forgot-password`, `/hop/reset-password`,
`/hop/app/*`, `/hop/admin/*` subtree — so loading the marketing site (including plain `/hop`)
never triggers a session check.

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
  (`hop_users.failed_login_attempts` / `locked_until`). No IP-based rate limiting yet.
- Password reset: `hop_password_resets` (id, user_id, token_hash, expires_at, used_at). Same
  "store the hash, not the raw token" pattern as sessions — `createPasswordResetToken` /
  `consumePasswordResetToken` in `hopAuth.ts`, dispatched via `api/hop/auth.ts`'s
  `?action=forgot-password|reset-password` (no new top-level function). Tokens expire after 30
  minutes and are single-use (`used_at`). `forgot-password` always returns the same generic
  message regardless of whether the email matched an account, to avoid leaking which emails have
  HOP accounts. A successful reset destroys *all* of that user's existing sessions
  (`destroyAllSessions`), forcing re-login everywhere. Requires `RESEND_API_KEY` to actually
  deliver the email — without it, the token is still created but the email send fails silently
  (logged, not thrown) so the generic response is unaffected.

## Theme (dark/light)

- `src/hop/ThemeContext.tsx` (`HopThemeProvider`) + `useHopTheme()` — `localStorage`-backed
  (`hop-theme`), defaults to `dark`. Renders a `<div data-hop-theme="dark|light">` wrapper around
  everything inside the HOP route tree (both the auth pages and the authenticated app/admin
  shells sit inside it).
- Scope is deliberately narrow: **HOP app + admin only**. The public marketing site keeps its
  fixed dark "cinematic canvas" design — it has no theme toggle and isn't wrapped in
  `HopThemeProvider`.
- `src/styles/hopApp.css` defines the base (dark) values for the `--hop-*` custom properties on
  `.hop-shell, .hop-auth-page`, plus a `[data-hop-theme='light'] .hop-shell, [data-hop-theme='light']
  .hop-auth-page` block overriding them for light mode. Every HOP rule should read colors via
  `var(--hop-*)` — never hardcode a hex/rgba color in HOP CSS — so the whole app (core pages +
  the componentized dashboard sections) reskins for free. Watch out for bare `h1`/`h2` elements:
  the marketing site's global `index.css` sets `h1, h2 { color: var(--text-h) }`, and `--text-h`
  follows the *browser's* OS color-scheme preference, not HOP's own toggle — any HOP heading needs
  its own explicit `color: var(--hop-text)` (see `.hop-auth-card__title`, `.hop-page-title`,
  `.hop-card h2`) or it'll silently ignore the HOP theme.
- Toggle buttons live in `HopAppLayout.tsx` and `HopAdminLayout.tsx`, next to "Log out".

## Integrations model

- `hop_integrations` holds one row per (user, provider). `provider` is an open set today:
  `google_calendar`, `fitbit`, `oura`, `apple_health`, `garmin`.
- Only `google_calendar` is real: OAuth handled in `api/hop/integrations/google.ts` (one flat
  file, `?action=start|callback|disconnect|events`) using plain `fetch` against Google's OAuth2 +
  Calendar v3 REST endpoints (no `googleapis` SDK, to keep Vercel function bundles small).
- The other providers exist only so the UI (`HopIntegrationsPage.tsx`) can render a consistent
  "connect this" card per provider; their connect buttons are disabled ("Coming soon") and hit
  no API. `hop_wearable_metrics` exists in the schema but nothing writes to it yet.

## Deployments

There are **two** Vercel projects sharing this one GitHub repo and this one Neon database. Don't
try to merge them back into one — the whole point is that staff/admin gets its own domain,
decoupled from the consumer-facing product, as the seed of a future standalone ERP.

- **`theconcierge`** (`ay-projects3/theconcierge`, production domain `theconcierge.life`) — tracks
  the `main` branch. Full app: public marketing site + consumer HOP signup/login (`/hop/app/*`) +
  admin portal (`/hop/admin/*`).
- **`theconcierge-staff`** (`ay-projects3/theconcierge-staff`, `theconcierge-staff.vercel.app` for
  now — no custom domain attached yet) — tracks the `staff-portal` branch. `src/App.tsx` on this
  branch is trimmed down to admin/staff only: `/hop/admin/login`, the `RequireAdmin` → `/hop/admin/*`
  tree, and the shared `/hop/forgot-password` + `/hop/reset-password` routes. Every other path
  (`/`, `/hop`, `/hop/login`, `/hop/signup`, `/hop/app/*`, marketing pages) redirects to
  `/hop/admin/login`. `api/**` is untouched and identical on both branches/deployments — same
  Vercel Functions, same `DATABASE_URL`, so admin accounts, sessions, and data are consistent
  across both domains. Env vars (`DATABASE_URL`, `SESSION_HASH_SECRET`) were copied over from the
  main project; `RESEND_API_KEY` still needs to be added to `theconcierge-staff` in the Vercel
  dashboard for password-reset emails to actually send there (the token still gets created
  without it — see the password-reset note above — it just won't be emailed).
- Keeping `staff-portal` in sync: it's based on `main` as of the branch-creation commit. Any
  future `api/**`, `hop/AuthContext.tsx`/`RequireAuth.tsx`/theme/CSS change made on `main` that
  should also apply to staff/admin needs to be merged or cherry-picked into `staff-portal`
  manually — the branches are not auto-synced. `src/App.tsx` is the one file that's *expected* to
  permanently diverge between the two branches (full routes vs. trimmed admin-only routes); don't
  try to reconcile it.
- **No git auto-deploy (deliberate, for now)**: `theconcierge-staff`'s Production Branch setting
  defaulted to `main` (the repo's default branch) when the project was first connected to GitHub,
  and neither the `vercel` CLI nor the public `PATCH /v9/projects/:id` API expose a way to change
  that non-interactively (several field/endpoint shapes were tried, all rejected). Left connected,
  **every push to `main` would silently redeploy `theconcierge-staff` with the full marketing
  site** — this actually happened once during setup. Rather than leave that landmine, the GitHub
  connection was disconnected (`vercel git disconnect`) for this project, so pushing to *either*
  branch no longer auto-deploys `theconcierge-staff`. Deploy it deliberately instead, from a
  worktree linked to the project:
  ```
  git worktree add ../staff-portal-worktree staff-portal
  cd ../staff-portal-worktree && git pull
  npx vercel link --project theconcierge-staff --yes
  npx vercel deploy --prod --yes
  ```
  (`vercel deploy --prod` was observed hanging/getting `BLOCKED` for several minutes when a stale
  build was mid-flight — if that happens, find the `READY` deployment for the right commit via
  `GET /v6/deployments?projectId=<id>&teamId=<id>` and run `npx vercel promote <deployment-id>
  --yes` instead of re-triggering a fresh build.)
  If someone with dashboard access later sets Settings → Git → Production Branch to `staff-portal`
  for the `theconcierge-staff` project, the GitHub connection can be safely re-added
  (`vercel git connect`) and this manual step won't be needed.
