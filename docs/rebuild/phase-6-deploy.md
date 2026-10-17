# Phase 6: Deploy the five Vercel projects and retire the old setup

**Goal:** the landing site and all four Portal apps are live as separate Vercel projects on one
Neon database, `/portal` links to them, leadership's walkthrough passes in production, and the
old `staff-portal` deployment is retired.

**Prerequisites:** Phases 1–5 done and merged to `main`.

**Read first:** `docs/portal/architecture.md` → Deployments, then `docs/portal/backend-guide.md`.
You'll finish that guide in this phase.

Several steps happen in the Vercel and Neon dashboards and **must be done by the human
operator**. For those steps, write precise click-by-click instructions in `backend-guide.md`,
then ask the operator to do them. Don't guess at their account state. Only run the `vercel` CLI
if the operator has logged it in and approves.

## Steps

1. **Pre-flight (agent):**
   - `npm run lint`, then build all five workspaces.
   - Run `find apps/*/app/api -name route.ts | wc -l` per app and confirm each is ≤ 12.
2. **Database (operator, guided):**
   - Run `npm run db:migrate` against production `DATABASE_URL`. It's idempotent, and the old
     `hop_*` tables are untouched.
   - Run `npm run hop:create-console-admin` for the real first console user.
   - **Do not** run the demo seed against production unless leadership wants a demo environment.
     If they do, use a separate Neon branch and separate Vercel preview env vars.
3. **Landing site (operator):** in the existing `theconcierge` project, change Root Directory to
   `apps/site`. Framework stays Vite. Keep its env vars and add the four `VITE_*_URL` values
   (fill them after step 4). Redeploy.
4. **Four new projects (operator):**
   - `hop-staff`, `hop-console`, `hop-rep` and `hop-facility`, all importing the same GitHub repo
     with the matching Root Directory and the Next.js preset.
   - Env vars per `architecture.md` → Deployments. `SESSION_HASH_SECRET` should be a new random
     64-hex value, the same in all four.
   - Set the Ignored Build Step command from `architecture.md` → Deployments.
   - Optionally add custom domains (for example `staff.theconcierge.life`). If so, update every
     `*_URL` env var.
5. **Wire the links:** set `VITE_STAFF_URL`, `VITE_CONSOLE_URL`, `VITE_REP_URL` and
   `VITE_FACILITY_URL` on the site, and `STAFF_URL`, `REP_URL`, `FACILITY_URL` and `APP_URL` on
   the apps. Redeploy the site and the console.
6. **Production walkthrough (agent + operator):**
   - Run all three tests in `prototype/HOP Portal How to Test the Flow.txt` against the live URLs.
     Use invited test reps (for example Andre and Renee) created from the Console Team screen,
     not the demo seed.
   - Check that each app refuses the other roles.
   - Disable the test accounts afterwards.
7. **Retire the old setup (operator confirms each step; these can't be undone):**
   - Pause, then delete, the `theconcierge-staff` Vercel project.
   - Delete the `staff-portal` branch on GitHub after confirming it's fully superseded.
   - Remove the local worktree: `git worktree remove ../theconcierge-staff-portal`.
   - Leave the old `hop_*` tables in Neon for now. Dropping them is a separate, explicit decision
     for leadership, and it needs a backup first.

## Done when

- [ ] Five green production deployments. `/portal` on the live site links to four working
      `/login` pages.
- [ ] Leadership's Tests 1–3 pass in production.
- [ ] `docs/portal/backend-guide.md` covers, for a non-engineer:
  - every env var per project
  - migrating
  - creating the first console user
  - inviting reps and facility admins
  - resetting a password
  - deploying and rolling back one app
  - where the logs are
- [ ] `staff-portal` retired (or the operator chose to keep it, noted in the guide).
- [ ] The status table in `docs/rebuild/README.md` shows all phases done. `mvp-scope.md` is
      final.

## Progress (2026-10-17)

- The four projects (`hop-staff`, `hop-console`, `hop-rep`, `hop-facility`) were created on the
  AY Projects team with the CLI. They're connected to the repo, and each has its env vars and the
  ignored build step. Production was deployed from `portal-rebuild` with
  `vercel deploy --prod --cwd apps/<app>`.
- The site project is `hop_services` (already at Root Directory `apps/site`), with the four
  `VITE_*_URL` values set. Merged to `main` and live on www.hopserves.com. The build had to be promoted by hand because an earlier rollback had paused auto-promotion.
- Leadership's Test 1, plus isolation and the privacy floor, pass against the live URLs (using the
  demo seed, by the operator's choice).
- `RESEND_API_KEY` couldn't be copied by the agent; the operator adds it (backend guide).

## Notes from earlier phases

_(none yet)_
