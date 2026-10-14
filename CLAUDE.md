# CLAUDE.md

This file is the entry point Claude Code (and any other agent) loads automatically when working
in this repo. Its only job is to route you to the right doc before you touch code. It
deliberately duplicates as little as possible, because duplicated facts go stale.

## Read this first, in order

1. **`docs/PROJECT_OVERVIEW.md`**: what this repo is (a landing site plus four HOP Portal apps in
   one npm-workspaces monorepo), the stack, local dev. Always read this before your first edit in
   a session.
2. **If touching anything under `apps/staff`, `apps/console`, `apps/rep`, `apps/facility` or
   `packages/shared`**: read `docs/portal/architecture.md` first, then `docs/portal/mvp-scope.md`.
   `architecture.md` describes how the Portal is *actually* wired. `mvp-scope.md` tracks what's
   real, what's stubbed with sample data, and what's not built yet. Both are living docs: update
   them in the same change that changes the behavior they describe.
3. **If you were asked to build a phase of the Portal**: `docs/rebuild/README.md`, then the
   `docs/rebuild/phase-N-*.md` file you were pointed at. Each phase file is self-contained and
   ends with a checklist; tick it off and update the status table in `docs/rebuild/README.md`.
4. **The source of truth for what the Portal should look like and do** is leadership's prototype
   in `prototype/`:
   - `prototype/starter/` is the Next.js starter code we port from.
   - `prototype/starter/docs/mockups/*.html` are the clickable concept mockups. Open them in a
     browser. They contain features the starter code doesn't.
   - `prototype/HOP Portal IT Handoff.md` lists the production to-dos.
5. **If the human operating this repo (not an agent) needs to do something on the backend**
   (set an env var, run a migration, create the first console account, deploy), point them to
   `docs/portal/backend-guide.md`, which is written for a non-engineer. Don't walk them through it
   inline.

## The rules that matter most

- **Five Vercel projects, one repo, one branch (`main`), one Neon database.** Each folder in
  `apps/` is its own Vercel project with its own Root Directory: `apps/site` (public landing),
  `apps/staff`, `apps/console`, `apps/rep`, `apps/facility`. They share code through
  `packages/shared` and share data through the one database. There is no more `staff-portal`
  branch. Don't recreate per-app branches.
- **One role per app, enforced server-side.** Roles: `staff`, `rep`, `console`,
  `facility_admin`. Every API route checks the signed-in user's role from the session cookie.
  Never trust a rep id, member name or facility id sent by the client.
- **The old HOP system is gone on purpose.** That covers the `/hop/app` member app, the admin,
  ConciergeHub, the feed, wellness, Google Calendar, the chatbot and the iOS wrapper. It was all
  removed in the 2026-10 rebuild. Its tables (`hop_users`, `hop_sessions`, `hop_service_requests`
  and the rest) still exist in Neon, unused. Don't read from or write to them. New Portal tables
  use the `portal_` prefix. Everything old is in git history before the `portal-rebuild` branch
  if leadership asks for it.
- **Vercel Hobby plan.** The 12-serverless-function cap is per project. Each Next.js app needs
  only a handful of route handlers, so there's plenty of headroom. If an app ever approaches it,
  consolidate with an `?action=` dispatch rather than proposing a Pro upgrade.

## Working conventions

- Trust the code over the docs. If a doc contradicts what you read in the code, the code is
  right. Fix the doc in the same change.
- Don't fabricate scope. If a feature isn't described as built in `docs/portal/mvp-scope.md`,
  assume it doesn't exist yet.
- `db/schema.sql` is one idempotent file (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
  EXISTS`, never `DROP`). Extend it, don't rewrite it. Apply from the repo root with
  `npm run db:migrate`.
- Copy and labels follow `prototype/starter/docs/BRAND.md`: warm, concise, no emojis in
  marketing copy, and status words exactly "New offer, Accepted, Started, In progress, Completed,
  Needs attention". Keep `[CONFIRM]` markers for open business decisions and `TODO(IT)` for
  services not wired yet.
