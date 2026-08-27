# HOP — Roadmap (Phase 3 remainder)

This is the technical design for the HOP feature backlog that came out of a 2026-07-23 strategy
review between the product owner and their boss, covering the concierge rep, HOP Admin, a new
Facility (hospital-client) portal, and the HOP member experience. **Phase 1 (quick wins), Phase 2
(Facility portal), and most of Phase 3 are now built** — see "HOP Phase 2" in `architecture.md`
for the actual shape of everything shipped 2026-08-27 (which absorbed Phase 2's Facility portal
plus Phase 3's points ledger, self/family dates, and certifications — a broader single cycle than
this doc's original two-phase split). This file now only covers what's genuinely still unbuilt:
the internal social feed and rewards redemption. Update this file in place as each remaining
piece ships — move its "what's real" content into `architecture.md`/`mvp-scope.md` and delete it
from here.

Function budget as of the 2026-08-27 pass (confirmed by counting `api/**/*.ts` excluding `_lib/`
on each branch): **`main` (theconcierge) at 12/12, fully maxed**, **`staff-portal`/ConciergeHub
(theconcierge-staff) at 12/12, fully maxed**. Any remaining item below needs a real consolidation
pass first on whichever branch it targets — see `CLAUDE.md` and `architecture.md` → "Deployments".

---

## Facility portal — shipped 2026-08-27

Built as designed below, plus the manually-logged retention/cost-savings piece that wasn't in
this doc's original sketch. See "HOP Phase 2" in `architecture.md` for the actual shape
(`hop_mood_checkins`, `role='facility'`, `hop_users.department`, `hop_retention_events`,
`api/hop/facility.ts`, `requireFacility`/`requireFacilityOrStaff`, `/hop/facility/*`). The
open decisions originally listed at the bottom of this file (mood check-in taps as 4 not 3,
`default_shift_end_time` as the minimal shift signal, department as a single free-text column,
deploying to `staff-portal` not `main`) were all confirmed and built as proposed. The design
below is kept only as historical reference for *how* it was designed — don't re-read it as "not
built yet."

<details>
<summary>Original Phase 2 design (click to expand — superseded by architecture.md)</summary>

A new, read-only aggregate dashboard for hospital-side administrators (the vendor/client — not
HOP's own admin). Ships on `staff-portal`/ConciergeHub, not `main` — it's read-only ops/aggregate
tooling in the same trust tier as the rest of ConciergeHub, and `main` has less function-budget
headroom. **This deployment choice wasn't specified by the boss — confirm it still makes sense
before building**, especially if a custom domain / separate branding is wanted for hospital
clients later.

Mood check-in (member-facing) has to ship first — the heat map has no data source without it.

### Schema

```sql
-- One-tap mood check-in, deliberately separate from hop_wellness_checkins (that table stays the
-- fuller voluntary self-report form — see "Wellness check-ins" in architecture.md). 4 levels,
-- not the 3 emoji the boss described verbatim, so it maps 1:1 to the 4-color heat map below with
-- no lossy remap — still a single tap, just one extra option.
CREATE TABLE IF NOT EXISTS hop_mood_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  level TEXT NOT NULL CHECK (level IN ('green', 'yellow', 'orange', 'red')),
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hop_mood_checkins_created_at_idx ON hop_mood_checkins (created_at DESC);
CREATE INDEX IF NOT EXISTS hop_mood_checkins_user_id_idx ON hop_mood_checkins (user_id);

-- New role + optional department for heat-map/overtime breakdown. Nullable department — an
-- "Unspecified" bucket is fine for v1, don't force a taxonomy that doesn't exist yet.
ALTER TABLE hop_users DROP CONSTRAINT IF EXISTS hop_users_role_check;
ALTER TABLE hop_users ADD CONSTRAINT hop_users_role_check
  CHECK (role IN ('user', 'admin', 'concierge', 'facility'));

ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS department TEXT;
```

`default_shift_end_time` and `hop_duty_log` (the overtime signal) already exist from Phase 1 —
no new schema needed for the "stayed late" metric beyond what's there.

### API

- **`main`**: extend `api/hop/wellness.ts` with a `?type=` param, default `wellness` (back-compat
  with the existing calls), `?type=mood` branches to `hop_mood_checkins` with its own validate/
  insert. Same `requireUser`/role-branched `GET` pattern already in that file. **No new file** —
  `main` stays at 11/12.
- **`staff-portal`**:
  - Same `?type=mood` extension to the shared `api/hop/wellness.ts` (kept byte-identical across
    branches even though no staff-portal UI calls it directly — the Facility dashboard queries
    `hop_mood_checkins` with its own aggregate SQL instead of routing through this file, since
    Vercel functions don't call each other).
  - Extend `api/hop/admin/concierges.ts` to accept `role: 'concierge' | 'facility'` on account
    creation (same temp-password + `hop_password_resets` invite-email mechanism already built).
    No new file.
  - Add `requireFacility` to `api/_lib/hopAuth.ts` (shared file, same shape as `requireConcierge`)
    — add it on both branches for sync consistency even though only `staff-portal` routes use it.
  - **Add `api/hop/facility.ts` (new, staff-portal only, +1 → 11/12)**:
    - `?action=overview` (GET, `requireFacility`) — today's on-duty count + names (reuses the
      `hop_duty_log` query pattern from `admin/users.ts?scope=on-duty`; attendance is not a
      wellness signal, so names are fine here); "worked past shift end" = duty rows where
      `COALESCE(clock_out_at, NOW()) > (clock_in_at::date + default_shift_end_time)`; aggregate
      morale = today's `hop_mood_checkins` grouped by `level`, **percentages only, no `user_id`
      in the response**.
    - `?action=heatmap` (GET, `requireFacility`) — mood check-ins bucketed by hour-of-day (and by
      `department` when populated, else "Unspecified"), counts/percentages per bucket only.

**Hard rule carried over from the existing wellness check-in principle** (see `architecture.md`):
morale/heat-map data is always aggregate/de-identified, never per-individual. Don't let a future
change join `hop_mood_checkins` back to a name in a facility-facing response.

### Frontend

- **`staff-portal`** (new `src/pages/hop/facility/`):
  - `HopFacilityLoginPage.tsx` (`/hop/facility/login`) — reuses the existing login POST action.
  - `HopFacilityDashboardPage.tsx` — on-duty count, overtime list, morale summary.
  - `HopFacilityHeatMapPage.tsx` (or a section of the dashboard) — green/yellow/orange/red by
    hour, department filter if populated.
  - `RequireFacility` added to `src/hop/RequireAuth.tsx` (same shape as `RequireConcierge`).
    `src/App.tsx` on `staff-portal` gains a `/hop/facility/*` subtree — expected, permanent
    divergence from `main`, same category as `HopAdminLayout.tsx`'s `NAV_ITEMS`.
  - `HopAdminConciergesPage.tsx` (or wherever account creation lives): add a role selector for
    `facility`, and a `default_shift_end_time` field when creating/editing any staff user.
- **`main`** (`src/pages/hop/app/`): new `HopMoodCheckinPrompt` component — a periodic in-app
  banner/modal (client-side interval + `localStorage` gate, **not** a real OS push notification —
  no push infrastructure exists in this repo; be honest about that in the UI copy). 4 one-tap
  emoji buttons mapped to `green/yellow/orange/red`, optional free-text elaboration, posts to
  `/api/hop/wellness?type=mood`.

### Cross-branch sync notes

`api/hop/wellness.ts` and `api/_lib/hopAuth.ts` (`requireFacility`) are shared — edit once, sync
both ways even though only one branch's UI calls the new bits. `db/schema.sql` is one shared edit.
`facility.ts`, the Facility frontend pages, and `/hop/facility/*` are staff-portal only.

</details>

---

## Points ledger, self/family dates, certifications — shipped 2026-08-27

All real — see "HOP Phase 2" in `architecture.md`. `hop_points_ledger`/`api/hop/rewards.ts`
shipped 2026-08-09 (manual award only); this cycle added the daily-task earning source
(`task_complete`) and `api/hop/profile.ts` (self/family dates, certifications, the AI-assistant
feed) on `main` only — deliberately not synced to `staff-portal`, since syncing it would exceed
that deployment's function cap now that `facility.ts` also landed this cycle. **Still not
built**: `?action=redeem` (no redemption flow) and the streak/profile-completion automatic
earning rules — the `source` CHECK values exist for these but nothing writes them. If either is
wanted later, `main` needs a consolidation pass first (see "Function budget" below) since it's
already at 12/12.

---

## Still unbuilt — internal social feed + rewards redemption

A lightweight internal social feed (posts/reactions/coworker status) and the rewards ledger's
redemption flow. Both explicitly deferred by the user's own decision in the 2026-08-27 cycle, not
forgotten — see "HOP Phase 2" in `architecture.md`.

### Function budget — read this before starting either piece

Both `main` and `staff-portal` are now **12/12, fully maxed** (see "Deployments" in
`architecture.md`). Redemption needs no new file (extends the already-built `api/hop/rewards.ts`
with `POST ?action=redeem`). The social feed needs one new file (`api/hop/social.ts`, `main`
only — no family/social surface is planned for ConciergeHub). Free a slot on `main` first:

- **Merge `api/hop/ride-location.ts` → `api/hop/requests.ts`** as `?action=location-*` (GET/POST,
  same visibility rules as today). This is the next available lever on `main`, already flagged in
  `architecture.md`'s "Deployments" section. **Shared file — apply on both branches** if
  `staff-portal` also needs a slot freed later (it doesn't yet, since nothing currently proposed
  needs a new `staff-portal` file).

### Schema (social feed only — everything else in the original design is already built)

```sql
CREATE TABLE IF NOT EXISTS hop_social_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hop_social_posts_created_at_idx ON hop_social_posts (created_at DESC);

CREATE TABLE IF NOT EXISTS hop_social_reactions (
  post_id UUID NOT NULL REFERENCES hop_social_posts (id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  reaction TEXT NOT NULL DEFAULT 'like',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS hop_user_status (
  user_id UUID PRIMARY KEY REFERENCES hop_users (id) ON DELETE CASCADE,
  status_type TEXT NOT NULL DEFAULT 'available'
    CHECK (status_type IN ('available', 'on_vacation', 'sick_leave', 'moved_department', 'other')),
  status_note TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### API

- **Redemption**: extend `api/hop/rewards.ts` (shared, both branches) with
  `POST ?action=redeem` — deducts points, creates a `hop_service_requests` row, links
  `request_id`. No new file. Also wire the still-unwritten `checkin_streak`/`profile_complete`
  automatic earning rules (`profile_complete` is actually already wired as of 2026-08-27 — see
  "HOP Phase 2" in `architecture.md` — only `checkin_streak`/`wearable_challenge` remain
  genuinely unwired, and `wearable_challenge` has no real trigger until wearable OAuth exists).
- **Social feed**: new `api/hop/social.ts` (`main` only) — `?action=posts` (GET feed, POST new
  post); `?action=react` (POST/DELETE on `hop_social_reactions`); `?action=status` (GET/PATCH own
  `hop_user_status`, GET all for a coworker directory view).

### Frontend

- `HopRewardsCard.tsx` (already built, on `HopProfilePage.tsx`) gains a "redeem toward a request"
  flow calling the new `?action=redeem`, routing into the existing request-tracking UI after
  redeeming. Revisit whether this still fits as a card or has earned a standalone
  `HopRewardsPage.tsx`/nav item once redemption makes the page's content meaningfully bigger.
  Staff-side: extend the existing "Award points" action (`HopAdminUsersPage.tsx`) to a
  concierge-facing surface too, if wanted — deliberately not built in the 2026-08-27 cycle (see
  "HOP Phase 2" in `architecture.md`'s Concierge section for why).
- New `HopSocialPage.tsx` (`main` only) — post composer/feed/reactions, plus a status picker.

### Cross-branch sync notes

`api/hop/rewards.ts` is shared — edit once, sync both ways. `api/hop/social.ts` and its frontend
page are `main`-only, expected permanent divergence. `db/schema.sql` is one shared edit.

---

## Decisions confirmed by what actually shipped (2026-08-27)

All four of this file's original open decisions were confirmed and built exactly as proposed:
Facility portal deployed to `staff-portal`/ConciergeHub, not `main`; mood check-in as 4 taps, not
3; shift schedule stayed minimal (`default_shift_end_time` + `hop_duty_log`, no real scheduling
system); department stayed a single nullable free-text column. See "HOP Phase 2" in
`architecture.md` for the shipped shape, and its "Known limitations" note for what these minimal
choices mean going forward (no facilities/multi-tenancy model, the on-duty signal is HOP's own
concierge duty log not hospital staff shifts, retention/satisfaction stays a proxy metric).
