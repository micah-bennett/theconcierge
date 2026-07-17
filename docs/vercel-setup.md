# Vercel and Neon setup

## Required environment variables

Configure these in the Vercel dashboard for Production, Preview, and Development:

- `DATABASE_URL`: pooled Neon connection string.
- `RESEND_API_KEY`: Resend API key for transactional email delivery (concierge-request
  notifications, HOP account-creation email, HOP password-reset email, HOP concierge-invite
  email). **Required on the ConciergeHub (`theconcierge-staff`) project specifically** — the
  in-app "Add Concierge" flow's clean path depends on it to email a set-password link; without
  it, the admin instead gets a temporary password back in the response to hand over directly
  (still works, just a manual fallback). See "ConciergeHub" in `docs/hop/architecture.md`.
- `SESSION_HASH_SECRET`: random secret used to hash HOP session tokens and password-reset tokens
  before storing them (`api/_lib/hopAuth.ts`). Generate with `openssl rand -hex 32`. Rotating this
  logs every HOP user out immediately.
- `AI_GATEWAY_API_KEY`: optional outside Vercel. Production Functions authenticate to Vercel AI Gateway using the automatically supplied OIDC token.
- `AI_MODEL`: optional; defaults to `google/gemini-2.5-flash`.
- `NOTIFY_EMAIL`: optional; overrides the default owner notification address.
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`: required for the HOP Google
  Calendar integration (`api/hop/integrations/google.ts`). See "Google Calendar integration
  (OAuth)" below. Without these, `getGoogleConfig()` returns `null` and the "Connect" button on
  `/hop/app/integrations` returns a clean `503` instead of attempting OAuth — the rest of HOP
  works normally either way.

These are server-only variables. Never prefix them with `VITE_`.

## Google Calendar integration (OAuth)

This is HOP's only live integration today — Fitbit, Oura, Apple Health, and Garmin are
"Coming soon" UI stubs with no OAuth wired up (see `docs/hop/mvp-scope.md`). One-time setup in
Google Cloud Console:

1. **Create or select a project** at console.cloud.google.com.
2. **Enable the API**: APIs & Services → Library → enable "Google Calendar API".
3. **Configure the OAuth consent screen**: APIs & Services → OAuth consent screen.
   - User type: External (unless restricting to a Google Workspace org).
   - Scopes: the app requests `calendar.readonly`, `openid`, and `email` — add
     `.../auth/calendar.readonly` under "Sensitive scopes" when prompted.
   - While the app is in "Testing" status, add every Google account that needs to test the
     connect flow under "Test users" — accounts not on that list get blocked at consent.
   - Publish to "In production" for real users; Google may require app verification for the
     calendar scope once usage goes beyond a handful of test accounts.
4. **Create an OAuth client ID**: APIs & Services → Credentials → Create Credentials → OAuth
   client ID → Application type **Web application**.
5. **Authorized redirect URIs** — add one entry per environment that will run the OAuth flow.
   These must match `GOOGLE_REDIRECT_URI` exactly, including the `?action=callback` query string
   (Google's redirect URI matching is an exact string match, not a prefix/wildcard match):
   - Local dev (`vercel dev`, default port 3000):
     `http://localhost:3000/api/hop/integrations/google?action=callback`
   - Production: `https://theconcierge.life/api/hop/integrations/google?action=callback`
   - The ConciergeHub deployment (`theconcierge-staff.vercel.app`, `staff-portal` branch) does
     **not** need an entry — that build is trimmed to admin/concierge routes only and never
     renders `/hop/app/integrations` or calls this integration (see "Deployments" in
     `docs/hop/architecture.md`).
6. Copy the generated Client ID and Client Secret into `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`.

### Per-environment values in Vercel

| Variable | Production | Development (local `vercel dev`) | Preview |
|---|---|---|---|
| `GOOGLE_CLIENT_ID` | same OAuth client ID | same OAuth client ID | same OAuth client ID (harmless if set) |
| `GOOGLE_CLIENT_SECRET` | same secret | same secret | same secret (harmless if set) |
| `GOOGLE_REDIRECT_URI` | `https://theconcierge.life/api/hop/integrations/google?action=callback` | `http://localhost:3000/api/hop/integrations/google?action=callback` | leave unset |

Vercel's **Preview** environment gets a unique `*.vercel.app` URL per deployment, so there is no
single fixed redirect URI to register for it up front. Leaving `GOOGLE_REDIRECT_URI` unset for
Preview is deliberate and safe: `getGoogleConfig()` returns `null`, so "Connect" cleanly 503s on
preview deployments instead of redirecting to a URI Google will reject. Everything else in HOP
(login, requests, admin) works fine on Preview without it.

For local development, put `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REDIRECT_URI` in
`.env.local` (see `.env.example`) and run `vercel dev` — plain `vite` does not serve `/api/*`, so
the OAuth start/callback routes won't be reachable under `npm run dev` alone.

## Create or update the database

```bash
export DATABASE_URL='your-pooled-neon-connection-string'
npm run db:migrate
```

The schema migration is idempotent and can be safely rerun.

## Local full-stack development

```bash
vercel env pull .env.local
vercel dev
```

The plain Vite development server does not execute the functions under `/api`.

## Deployment

Vercel deploys pushes to the GitHub production branch automatically. The `vercel.json` rewrite enables React Router deep links, while files under `api/` are deployed as Node.js Functions.