# HOP — Roadmap (Phases 2 and 3)

This is the technical design for the HOP feature backlog that came out of a 2026-07-23 strategy
review between the product owner and their boss, covering the concierge rep, HOP Admin, a new
Facility (hospital-client) portal, and the HOP member experience. **Phase 1 (quick wins) is
built** — see `architecture.md` for its actual shape. This file is the plan for Phase 2 (Facility
portal) and Phase 3 (deeper member engagement), written so a future session can execute either
phase without re-deriving the design. Update this file in place as each phase ships — move its
"what's real" content into `architecture.md`/`mvp-scope.md` and delete it from here, the same way
Phase 1 no longer needs its own section in this file.

Function-budget baseline entering this roadmap (confirmed by counting `api/**/*.ts` excluding
`_lib/` on each branch): **`main` (theconcierge) at 11/12**, **`staff-portal`/ConciergeHub
(theconcierge-staff) at 10/12**. Both plans below are designed to stay within the Hobby-plan
12-function cap — see `CLAUDE.md` and `architecture.md` → "Deployments" before adding any new
top-level `api/*.ts` file outside what's specified here.

---

## Phase 2 — Facility portal

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

---

## Phase 3 — Deeper member engagement

Family/self profile dates, a rule-based dashboard suggestion feed, a lightweight internal social
feed, and a points/rewards ledger.

### Prerequisite consolidation (do this first — `main` has 0 headroom otherwise)

Phase 3 needs 3 new files on `main` (`profile.ts`, `social.ts`, `rewards.ts`), but `main` sits at
11/12 after Phase 1 (facility work above doesn't touch `main`'s count). Free 2 slots first:

- **Merge `api/relief.ts` → `api/requests.ts`** (the unrelated top-level concierge-request/
  relief-call product) as `?type=relief` on the existing handler. `main` only — `relief.ts` is
  already flagged in `mvp-scope.md` as the standing best candidate to free a slot; it's an
  orphaned feature (backend works, no UI links to it). Frees 1 → 10/12.
- **Merge `api/hop/request-messages.ts` → `api/hop/requests.ts`** as `?action=messages` (GET/POST,
  `requestId` param), same visibility rules as today (requester + assignee + any admin/concierge).
  **Shared file — apply on both branches.** Frees 1 on each: `main` → 9/12, `staff-portal` → 9/12
  (staff-portal was at 10/12 after Phase 2's `facility.ts` addition, or 10/12 if Phase 2 hasn't
  shipped yet — either way this merge frees exactly 1).

### Schema

```sql
-- Self dates directly on hop_users (1:1, cheap); family members/moments as 1:many.
ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS anniversary DATE;

CREATE TABLE IF NOT EXISTS hop_family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT '',
  name TEXT NOT NULL,
  birthday DATE,
  special_moment_note TEXT NOT NULL DEFAULT '',
  special_moment_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hop_family_members_user_id_idx ON hop_family_members (user_id);

-- Posts, reactions, lightweight presence/status.
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

-- Append-only points ledger; balance = SUM(delta). `source` is an open set so a future
-- wearable-driven earning rule slots in later without restructuring anything. A redemption is
-- just a negative-delta row with source='redemption' and request_id pointing at the
-- hop_service_requests row it paid for — no separate redemption table, reuses the existing
-- request lifecycle instead of building a parallel one.
CREATE TABLE IF NOT EXISTS hop_points_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  delta INT NOT NULL,
  source TEXT NOT NULL
    CHECK (source IN ('admin_award', 'concierge_award', 'checkin_streak', 'profile_complete', 'redemption', 'wearable_challenge')),
  reason TEXT NOT NULL DEFAULT '',
  awarded_by UUID REFERENCES hop_users (id) ON DELETE SET NULL,
  request_id UUID REFERENCES hop_service_requests (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS hop_points_ledger_user_id_idx ON hop_points_ledger (user_id, created_at DESC);
```

**Rewards, without wearable data**: the boss's example (steps → points) needs real wearable sync,
which doesn't exist yet (Fitbit/Oura/Apple Health/Garmin are still UI-only stubs — see
`mvp-scope.md`). Ship the ledger now with non-wearable v1 earning sources — admin/concierge manual
awards, a check-in streak bonus, profile-completion bonus — so the reward *mechanism* works
end-to-end today, and `source='wearable_challenge'` is already a valid ledger value waiting for a
real trigger once wearable OAuth exists.

### API

- **`main`**:
  - **Add `api/hop/profile.ts`** — `?action=self` (GET/PATCH birthday/anniversary — natural home
    for the Phase 1 `phone` field too, if `auth.ts?action=update-profile` outgrows itself);
    `?action=family` (GET/POST/DELETE family members); `?action=feed` — **rule-based v1**: server
    assembles upcoming birthdays/anniversaries (self + family, next 14 days) + time-of-day
    suggestion rules (e.g. 11:30–13:30 local → "want HOP to arrange lunch?"). Calendar proximity
    comes from the client separately calling the existing `integrations/google.ts?action=events`
    and merging client-side — keeps this endpoint DB-only, no outbound Google call from here. A
    future version could pass the same signals to `api/chat.ts`'s existing Anthropic client for a
    generated suggestion instead of the static rule table — same input shape, swap the rule
    engine for a prompt; don't build toward that now, just leave the seam obvious.
  - **Add `api/hop/social.ts`** — `?action=posts` (GET feed, POST new post); `?action=react`
    (POST/DELETE on `hop_social_reactions`); `?action=status` (GET/PATCH own `hop_user_status`,
    GET all for a coworker directory view).
  - **Add `api/hop/rewards.ts`** (shared with `staff-portal`) — `GET` own ledger + running
    balance (streak/profile-completion bonuses computed on read, or via a helper called from
    wherever the qualifying action happens — e.g. `wellness.ts`'s mood `POST` could call a shared
    `maybeAwardStreak()` helper — keep that logic in one place, not duplicated per caller);
    `POST ?action=redeem` — deducts points, creates a `hop_service_requests` row, links
    `request_id`; `POST ?action=award` (`requireStaff`) — manual award.
  - Result: `main` at 9/12 (post-consolidation) + 3 new files = **12/12, fully maxed**. The next
    feature on `main` needs another consolidation pass first — `api/hop/ride-location.ts` folding
    into `api/hop/requests.ts` as `?action=location-*` is the next available lever; flag that
    explicitly rather than silently exceeding the cap.
- **`staff-portal`**: add the same `api/hop/rewards.ts` (shared file, identical content) — its
  only caller here is a small "Award points" action on the admin/concierge request or client-
  detail view. `profile.ts`/`social.ts` are `main`-only by design (no family/social surface planned
  for ConciergeHub). Result: staff-portal at 9/12 (post-consolidation) + 1 = **10/12**, one slot
  of headroom remaining.

### Frontend

- **`main`**:
  - `HopDashboardPage.tsx` — new "roadmap" feed section pulling `profile.ts?action=feed` +
    calendar events, rendered as a card list; dismissal state in `localStorage` (no server-side
    dismissal table — avoids schema growth for a UX nicety).
  - New `HopFamilyProfilePage.tsx` — self dates + family member CRUD.
  - New `HopSocialPage.tsx` — post composer/feed/reactions, plus a status picker.
  - New `HopRewardsPage.tsx` — points balance, ledger history, "redeem toward a request" flow that
    routes into the existing request-tracking UI after redeeming.
- **`staff-portal`**: small "Award points" action on the concierge/admin request view.

### Cross-branch sync notes

`api/hop/requests.ts` (now also carrying the merged message-thread logic) and `api/hop/rewards.ts`
are shared — edit once, sync both ways. `profile.ts`, `social.ts`, and their frontend pages are
`main`-only, expected permanent divergence. `db/schema.sql` is one shared edit for all of the
above.

---

## Open decisions to confirm before building (recap)

1. **Facility portal deployment**: `staff-portal`/ConciergeHub, not `main` — reasoned default,
   not something the boss specified. Confirm before Phase 2.
2. **Mood check-in taps: 4, not the boss's literal 3** — maps 1:1 to the heat map's 4 colors.
   Reasoned default; flag if it needs to match the boss's exact wording instead.
3. **Shift schedule stays minimal**: a per-user `default_shift_end_time` (already built in Phase
   1) + `hop_duty_log`, not a real scheduling system. Revisit only if per-day variable schedules
   are actually requested.
4. **Department is a single nullable free-text column**, no taxonomy table — the heat map
   degrades to "Unspecified" if unused.
