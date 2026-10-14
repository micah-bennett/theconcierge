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

- [x] `npm run build -w @hop/facility` passes (and `npm run typecheck -w @hop/facility`). The app
      has no ESLint config, so there's no separate lint step to run. *(2026-10-14)*
- [ ] Sign in as facility@demo.hop. Every view from the mockup works. Switching metric and range
      refetches. *(Not verified: no dev database was available. The UI is built and refetches on
      every metric/range change in code.)*
- [ ] The seeded small unit shows as suppressed. The API JSON contains no value for it (check it
      with curl, not just in the UI). *(Verified in `apps/facility/scripts/check-suppression.mts`
      with seed-shaped rows for every metric × range, including a check that no value or group
      size for the small unit appears anywhere in the serialized response. The curl check against a
      seeded DB is still to do.)*
- [ ] Send support → appears in the Console queue as a unit-level item with no names. The radar
      shows Sent. *(Not verified: no dev database.)*
- [x] A facility admin for facility A can't read facility B. There's no parameter to even ask.
      *(Every query takes the facility id from `user.facilityId`; the route reads only `metric`,
      `range` and `action` from the URL. Unauthenticated GET/POST return 401, checked with curl
      against `next start`.)*
- [ ] Docs: `mvp-scope.md` Facility rows and the status table. *(Left to the coordinating session:
      this phase ran in a parallel lane that may not edit `docs/portal/*` or the README.)*

## Phase 5 build notes (2026-10-14)

- **Where things are.** Aggregation + suppression: `apps/facility/lib/server/aggregate.ts` (pure,
  no DB, so the assert script can run it). DB loading and writes: `apps/facility/lib/server/
  facility.ts`. Route: `apps/facility/app/api/facility/route.ts`. UI:
  `apps/facility/components/FacilityApp.tsx` + `app/facility.css`. Assert script:
  `node --experimental-strip-types apps/facility/scripts/check-suppression.mts` (repo root).
- **Suppression.** A unit is suppressed when the smallest `group_size` among its signal rows in
  the 14-day window is below `MIN_GROUP_SIZE`; a cell is suppressed when any row it was built
  from is. Suppressed units and radar entries are exactly `{ id/unitId, name, suppressed: true }`;
  cells are exactly `{ suppressed: true }`. Suppressed units are excluded from every
  facility-wide average (hour averages, Surge Shield) so nothing can be recovered by differencing.
- **Strain** is computed server side as 0.45·stress + 0.35·missed_breaks + 0.2·requests (a stored
  `strain` row wins if one exists). [CONFIRM weighting]
- **"Today"** is the latest day with signals for the facility (so an old seed still renders);
  "This week" is the 7-day mean; "Next week forecast" is the 7-day mean nudged by the last 3 days
  vs the 4 before, capped at −10%/+15%. [CONFIRM forecast model]
- **Radar score** = mean of the unit's three hottest two-hour strain slots this week + 2 per slot
  at strain ≥ 62, capped at 100. Bands High ≥ 75 / Watch ≥ 55 / Steady. Trend = score minus last
  week's. Drivers and the signal sentence are generated from the unit's own visible cells.
  Suggested actions are fixed content per band (`ACTIONS_BY_LEVEL`); Steady units show "No action
  needed". With the demo seed: Emergency and ICU High, Home Health Watch, the rest Steady,
  Wound Care suppressed. [CONFIRM formula]
- **The `requests` metric deviates from the plan above.** The heat map's "HOP requests" metric reads
  the seeded `requests` signal (an hourly 0–100 index), because live request counts have no hour
  shape and the demo has only three staff. Live counts *are* computed from `portal_requests` →
  `portal_staff_profiles` → units (last 7 days, staff members only, cancelled excluded) and shown in
  the Department breakdown's "HOP requests (7d)" column, suppressed per unit when fewer than
  `MIN_GROUP_SIZE` staff (not disabled) are enrolled in that unit (so every demo unit shows 🔒 there).
- **Send support** validates the unit against `listUnits(user.facilityId)`, accepts only actions
  from the fixed catalog (so free text, and therefore names, can't reach the Console), refuses a
  second open send for the same unit (409), then `createRequest` (`source: "facility"`,
  `memberId` = the admin, `member` = facility name, `role: "Facility leader"`, `cat: "errand"`,
  text `Unit support for <unit>: <actions>`) and inserts `portal_support_actions` with its
  `request_id`. `POST ?action=resolve { unitId }` marks the facility's open support resolved. The
  radar shows the latest support per unit from the last 7 days, including the Console request's
  progress (dispatched → "HOP on it", completed → "Done by HOP").
- **Sample, not real:** the "Sample data" tag; KPIs other than "Units on high alert"; "Where the data
  comes from"; Morale/Retention/Top request columns; the morale/retention chart; Pilot measurement;
  What we measure. "Pre stage support" and "Capture day 90 survey" only record local UI state and
  say so in a toast (TODO(IT)). The unit signals themselves are the seeded demo rows.

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
