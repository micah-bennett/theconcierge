# HOP Portal rebuild: phase guide

Leadership's HOP Portal concept is too big to build in one go, so it's split into phases. Each
`phase-N-*.md` file is written so that an agent with no prior context can run it from start to
finish. To run one, tell an agent:

> Read CLAUDE.md, then execute docs/rebuild/phase-N-<name>.md.

Run Phase 1 first. Phases 2–5 each produce one deployable app and only touch their own
`apps/<app>` folder, so they can be built in parallel (that's how they were built).

## Status

| Phase | File | Builds | Status |
|---|---|---|---|
| 0 | n/a (done in the planning session) | Removed the old HOP system and iOS, moved the landing site to `apps/site`, set up the workspace and wrote these docs | ✅ Done 2026-10-14 |
| 1 | `phase-1-foundation.md` | `packages/shared`, the DB schema, auth, the shared UI and the demo seed, plus the skeletons of all four apps | ✅ Done 2026-10-17 (verified against the database) |
| 2 | `phase-2-console.md` | `apps/console`: Concierge Console + Team accounts | ✅ Done 2026-10-17 (verified against the database) |
| 3 | `phase-3-rep.md` | `apps/rep`: Concierge Rep App | ✅ Done 2026-10-17 (verified against the database) |
| 4 | `phase-4-staff.md` | `apps/staff`: Staff App + self sign-up | ✅ Done 2026-10-17 (verified against the database; leadership's Test 2 click-through still open) |
| 5 | `phase-5-facility.md` | `apps/facility`: Facility View | ✅ Done 2026-10-17 (verified against the database) |
| 6 | `phase-6-deploy.md` | Five Vercel projects, retiring `staff-portal`, the end-to-end test | 🟡 2026-10-17: all five live (site on www.hopserves.com), Test 1 passes in production. Still open: `RESEND_API_KEY` on the apps, the real console admin, removing the demo, retiring `staff-portal` |

When you finish a phase:
1. Set its row to ✅ with the date.
2. Update `docs/portal/mvp-scope.md` honestly.
3. Fix `docs/portal/architecture.md` wherever what you built differs from the design.

## Rules for every phase

1. **Read before porting.** For the screen you're building:
   - Open the matching mockup in `prototype/starter/docs/mockups/` in a browser. All four HTML
     files are the same combined demo opened on a different view.
   - Read the starter component in `prototype/starter/components/`.
   - The mockup wins on what features exist, and the starter wins on code structure. Where the
     mockup has a screen the starter lacks, build it in the starter's style (same classes, same
     component patterns).
2. **Port, don't re-invent.** Copy the starter's JSX, class names, copy text and sample data.
   Change only what the phase file says to change: auth, real data, removing demo pickers,
   removing the phone frame.
3. **No demo pickers in production UI.** Remove the starter's "See it as" role switcher and rep
   switcher. Identity comes from the session.
4. **Server-side checks on every route.** Use `requireUser(request, APP_ROLE)` and ownership in
   the SQL `WHERE`. See the table "Who may change what on a job" in `docs/portal/architecture.md`.
5. **Keep the markers.** Leave `[CONFIRM]` (open business decisions) and `TODO(IT)` (services not
   wired) visible in the code. Don't invent answers to them.
6. **Verify before ticking a box.** Every phase ends with a checklist that includes running the
   app. "It compiles" is not "done". If you can't run something (for example, there's no
   `DATABASE_URL`), say so in your final message. Don't tick that box.
7. **Stay in scope.** If you find something that belongs to a later phase, leave a note in that
   phase's file under "Notes from earlier phases". Don't build it now.

## Reference material

| Path | What |
|---|---|
| `prototype/starter/` | Leadership's Next.js starter: the code we port |
| `prototype/starter/docs/mockups/*.html` | Clickable mockups, with every planned feature |
| `prototype/starter/docs/BRAND.md` | Brand voice, colours, status words |
| `prototype/HOP Portal IT Handoff.md` | Production to-dos (auth, privacy, integrations) |
| `prototype/HOP Portal How to Test the Flow.txt` | Leadership's acceptance walkthrough. Phase 6 runs it |
| `docs/portal/architecture.md` | The target design: layout, auth, schema, flow, deployments |
