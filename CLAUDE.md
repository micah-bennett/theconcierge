# CLAUDE.md

This file is the entry point Claude Code (and any other agent) loads automatically when working
in this repo. Its only job is to route you to the right doc before you touch code — it
deliberately duplicates as little as possible, since duplicated facts go stale.

## Read this first, in order

1. **`docs/PROJECT_OVERVIEW.md`** — what this codebase is, the stack, build modes, local dev
   quirks. Always read this before your first edit in a session.
2. **If touching anything under `/hop`**: `docs/hop/vision.md` → `docs/hop/architecture.md` →
   `docs/hop/mvp-scope.md`, in that order. `architecture.md` describes how HOP is *actually*
   wired; `mvp-scope.md` tracks what's real vs. stubbed vs. explicitly deferred, specifically so
   an agent doesn't re-propose something already tried and reversed, or invent a feature that was
   never built. Both are living docs — update them in the same change that changes the behavior
   they describe.
3. **If planning new HOP work**: `docs/hop/roadmap.md` has the phased technical design for
   everything not yet built (Facility portal, member social feed, rewards, family profiles, etc.)
   — check it before designing a feature from scratch; the shape may already be decided there.
4. **If the human operating this repo (not an agent) needs to do something on the backend** —
   set an env var, run a migration, create the first admin account, deploy either branch — that's
   `docs/hop/backend-guide.md`, written for a non-engineer. Point them there rather than walking
   them through it inline.

## The two rules that matter most

- **Two Vercel deployments, one repo, one Neon database.** `main` branch → `theconcierge`
  project (public site + HOP member app). `staff-portal` branch → `theconcierge-staff` project
  ("HOP ConciergeHub" — concierge + admin). They are **not** auto-synced; a shared file changed on
  one branch must be manually applied to the other (a linked worktree usually already exists at
  `../theconcierge-staff-portal` — check `git worktree list` before creating a new one). Full
  detail, including exactly which files are shared vs. deliberately divergent: `docs/hop/
  architecture.md` → "Deployments".
- **Vercel Hobby plan: 12-serverless-function hard cap, per project.** Check the current count
  before adding a new top-level `api/*.ts` file (`find api -name "*.ts" -not -path "*/_lib/*" |
  wc -l` on each branch). If there's no headroom, consolidate an existing file into a `?action=`/
  `?scope=` dispatch pattern first (see `api/hop/auth.ts` or `api/hop/admin/users.ts` for the
  existing pattern) rather than proposing a Pro-plan upgrade — the user has already decided to
  stay on Hobby and design around the cap.

## Working conventions

- Trust the code over the docs. If a doc contradicts what you read in the code, the code is
  right — fix the doc in the same change.
- Don't fabricate scope. If a feature isn't described as built in `mvp-scope.md`/`architecture.md`,
  assume it doesn't exist yet, even if it sounds like it should.
- `npm run dev` (plain Vite) does not serve `/api/*`. Use `vercel dev` for anything that touches
  the API or database.
- `db/schema.sql` is one idempotent file (`CREATE TABLE IF NOT EXISTS`, `ADD COLUMN IF NOT
  EXISTS`, never `DROP COLUMN`) — extend it, don't rewrite it. Apply with `npm run db:migrate`.
