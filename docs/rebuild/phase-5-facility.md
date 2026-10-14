# Phase 5: Facility View (`apps/facility`)

**Goal:** hospital leaders sign in and see a care-team heat map and Burnout Radar for **their
facility only**, as **unit totals only**. They can send support to a unit in one tap, and it
reaches the HOP Console. No names or personal data ever reach this app.

**Prerequisites:** Phases 1 and 2. The Console must exist so support requests have somewhere to
land.

**Read first:**
- `docs/portal/architecture.md` → Privacy rules (non-negotiable)
- `prototype/starter/components/facility/FacilityApp.tsx`
- In the mockup (`prototype/starter/docs/mockups/facility-view.html`): `facility`, `heatPanel`,
  `radarPanel`, `sendSupport`, `lineChart`, plus the KPIs and the time-range and metric switches.

## 1. Scaffold

Same pattern as Phase 2, with `@hop/facility`, port 3004, `APP_ROLE = "facility_admin"`,
`APP_NAME = "Facility View"`. It's a desktop-first layout using the starter's `.chead`, `.panel`
and `.kpis`, and must still be usable on a tablet. No sign-up: facility admins are invited from
the Console Team screen with a facility attached.

## 2. API (`requireUser(request, "facility_admin")`; facility = `user.facilityId`, never from the client)

| Route | Method | Does |
|---|---|---|
| `/api/facility` | GET `?metric=strain\|stress\|missed_breaks\|requests&range=today\|week\|next` | Heat-map cells (unit × hour), unit KPIs, Burnout Radar scores (0–100 per unit) and the morale/retention trend, all aggregated from `portal_unit_signals` for this facility. **Any unit or cell with `group_size < MIN_GROUP_SIZE` (5) comes back as `{ suppressed: true }` with no value.** The `requests` metric is computed live from `portal_requests`, joined through staff profiles to units, as counts only. |
| `/api/facility` | POST `?action=support` | `{ unitId, actions: string[] }`. Validates that the unit belongs to the facility. Writes `portal_support_actions` and creates a Console queue item: a `portal_requests` row with `source: "facility"`, the member set to the facility admin, and text naming the unit and the actions, never any staff names. Status sent → resolved is shown back on the radar. |

`MIN_GROUP_SIZE` lives in `@hop/shared/brand`. Put a unit test or an assert script on the
suppression function: it's the privacy guarantee.

## 3. Screens

Port `FacilityApp.tsx`, then do a gap check against the mockup:
- KPIs ("Units on high alert" and the rest)
- the heat map with metric switches (Strain, Stress, Missed breaks, HOP requests), range switches
  (Today, This week, Next week forecast) and click-a-cell details
- Burnout Radar with All, High, Watch and Sent filters, per-unit suggested actions and "Send
  support"
- the radar activity log
- the morale/retention line chart

Show suppressed cells as hatched grey with the tooltip "Fewer than 5 people, hidden for privacy".
Keep the "Sample data" tag visible while signals are seeded rather than real. Add a facility name
header from the session, plus Sign out.

## Done when

- [ ] `npm run build -w @hop/facility` and lint pass.
- [ ] Sign in as facility@demo.hop. Every view from the mockup works. Switching metric and range
      refetches.
- [ ] The seeded small unit shows as suppressed. The API JSON contains no value for it (check it
      with curl, not just in the UI).
- [ ] Send support → appears in the Console queue as a unit-level item with no names. The radar
      shows Sent.
- [ ] A facility admin for facility A can't read facility B. There's no parameter to even ask.
- [ ] Docs: `mvp-scope.md` Facility rows and the status table.

## Notes from earlier phases

- **Phase 1 already scaffolded this app.** `apps/facility` has `package.json` (dev port 3004),
  `next.config.ts`, `tsconfig.json`, `lib/app.ts`, the root layout, `/login`, `/set-password`,
  `/api/auth`, `public/logo.png` and an `(app)/` group whose layout requires the session. Replace
  the placeholder `app/(app)/page.tsx` and skip the "Scaffold" section below, except for anything
  it lists that doesn't exist yet.
- Wrap routes as `export const GET = withAuth(APP_ROLE, async (request, user, ctx) => …)`
  (`@hop/shared/server/auth`). Use `readJson`, `json` and `zodMessage` from
  `@hop/shared/server/db`, and the store functions in `@hop/shared/server/store`. Read
  `packages/shared/src/` before writing anything new; most of what you need is there.
- Use `useJobs` from `@hop/shared/client`. It takes no rep argument, `update()` returns a promise
  that rejects with `ApiError`, and `onData` gives you the whole `/api/jobs` response.
- UI from `@hop/shared/ui/*`: `Phone`/`usePhone`/`ICONS`/`useDesktopToast`, `AppHeader`
  (+ `SignOutButton`), `StatusSteps` (+ `statusPill`), `SignaturePad`. All the starter's CSS
  classes are in `@hop/shared/styles/portal.css`, already imported.
- Demo accounts (after `hop:seed-demo`; every password is `DEMO_PASSWORD`):
  - console@demo.hop
  - renee@ / marcus@ / andre@demo.hop (reps)
  - jordan@ / patel@ / kelly@demo.hop (staff)
  - facility@demo.hop

  The facility is "Hudson Valley Medical Center", with 6 mockup units plus "Wound Care"
  (group size 3, which must be suppressed).
