CREATE TABLE IF NOT EXISTS concierge_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  address_line_1 TEXT NOT NULL DEFAULT '',
  address_line_2 TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL,
  country TEXT NOT NULL DEFAULT 'United States',
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  date_needed DATE,
  time_needed TEXT NOT NULL,
  request_type TEXT NOT NULL,
  details TEXT NOT NULL DEFAULT '',
  hear_about_us TEXT NOT NULL DEFAULT '',
  payment_method TEXT NOT NULL DEFAULT '',
  cardholder_name TEXT NOT NULL DEFAULT '',
  card_last_four VARCHAR(4) NOT NULL DEFAULT '',
  exp_month VARCHAR(2) NOT NULL DEFAULT '',
  exp_year VARCHAR(4) NOT NULL DEFAULT '',
  firebase_document_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE concierge_requests
  ADD COLUMN IF NOT EXISTS firebase_document_id TEXT;

ALTER TABLE concierge_requests
  ALTER COLUMN date_needed DROP NOT NULL;

CREATE INDEX IF NOT EXISTS concierge_requests_created_at_idx
  ON concierge_requests (created_at DESC);

CREATE INDEX IF NOT EXISTS concierge_requests_email_idx
  ON concierge_requests (LOWER(email));

CREATE UNIQUE INDEX IF NOT EXISTS concierge_requests_firebase_document_id_idx
  ON concierge_requests (firebase_document_id)
  WHERE firebase_document_id IS NOT NULL;

ALTER TABLE concierge_requests
  ADD COLUMN IF NOT EXISTS path TEXT NOT NULL DEFAULT 'individual';

-- ── Relief call (facility discovery-call) requests ─────────────────────────

CREATE TABLE IF NOT EXISTS relief_call_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  title_facility TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS relief_call_requests_created_at_idx
  ON relief_call_requests (created_at DESC);

-- ── HOP: users, sessions, service requests, integrations ──────────────────

CREATE TABLE IF NOT EXISTS hop_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hop_users_email_idx
  ON hop_users (LOWER(email));

CREATE TABLE IF NOT EXISTS hop_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS hop_sessions_token_hash_idx
  ON hop_sessions (token_hash);

CREATE INDEX IF NOT EXISTS hop_sessions_user_id_idx
  ON hop_sessions (user_id);

CREATE TABLE IF NOT EXISTS hop_service_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  service_type TEXT NOT NULL CHECK (service_type IN ('ride', 'meal', 'errand', 'wellness', 'family_home', 'other')),
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_progress', 'completed', 'cancelled')),
  details TEXT NOT NULL DEFAULT '',
  requested_for TIMESTAMPTZ,
  handled_by UUID REFERENCES hop_users (id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_service_requests_user_id_idx
  ON hop_service_requests (user_id);

CREATE INDEX IF NOT EXISTS hop_service_requests_created_at_idx
  ON hop_service_requests (created_at DESC);

-- Dispatch workflow (2026-07-14): expands the status lifecycle beyond the original
-- submitted/in_progress/completed/cancelled. `handled_by` is reused as the *assigned* staff
-- member (not just "whoever last touched status") — see docs/hop/architecture.md ("Dispatch
-- workflow") before changing what this column means; it was not renamed to avoid a risky
-- non-idempotent column rename on a table with existing rows.
ALTER TABLE hop_service_requests DROP CONSTRAINT IF EXISTS hop_service_requests_status_check;
ALTER TABLE hop_service_requests ADD CONSTRAINT hop_service_requests_status_check
  CHECK (status IN ('submitted', 'received', 'assigned', 'in_progress', 'en_route', 'arrived', 'completed', 'cancelled'));

-- Status-change audit trail. Append-only; every staff-initiated status change, assignment
-- change, or standalone dispatch note becomes one row here (see api/hop/requests.ts).
CREATE TABLE IF NOT EXISTS hop_service_request_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES hop_service_requests (id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  changed_by UUID REFERENCES hop_users (id) ON DELETE SET NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_service_request_status_history_request_id_idx
  ON hop_service_request_status_history (request_id, created_at);

-- Live ride location (2026-07-14). One row per request, upserted — deliberately no history:
-- only the latest known location while a ride is en_route. Deleted (not just marked inactive)
-- the moment status leaves en_route, sharing is stopped, or the request reaches a terminal
-- status — see docs/hop/architecture.md ("Live ride location") for the full privacy behavior.
CREATE TABLE IF NOT EXISTS hop_ride_locations (
  request_id UUID PRIMARY KEY REFERENCES hop_service_requests (id) ON DELETE CASCADE,
  shared_by UUID REFERENCES hop_users (id) ON DELETE SET NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hop_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('google_calendar', 'fitbit', 'oura', 'apple_health', 'garmin')),
  status TEXT NOT NULL DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  external_account_email TEXT NOT NULL DEFAULT '',
  connected_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS hop_integrations_user_provider_idx
  ON hop_integrations (user_id, provider);

-- Schema-only for now; no wearable integration writes to this yet (see docs/hop/mvp-scope.md).
CREATE TABLE IF NOT EXISTS hop_wearable_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  value NUMERIC NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL,
  synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_wearable_metrics_user_id_idx
  ON hop_wearable_metrics (user_id);

CREATE TABLE IF NOT EXISTS hop_password_resets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS hop_password_resets_token_hash_idx
  ON hop_password_resets (token_hash);

CREATE INDEX IF NOT EXISTS hop_password_resets_user_id_idx
  ON hop_password_resets (user_id);

-- ── HOP: voluntary wellness check-ins ───────────────────────────────────
-- Append-only self-report log, not a clinical/performance record — see
-- docs/hop/architecture.md ("Wellness check-ins") before adding scoring, risk
-- alerts, or per-user analytics on top of this table.
CREATE TABLE IF NOT EXISTS hop_wellness_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  feeling TEXT NOT NULL
    CHECK (feeling IN ('doing_well', 'stretched_thin', 'low_energy', 'overwhelmed')),
  desired_support TEXT NOT NULL
    CHECK (desired_support IN ('meal', 'ride', 'errands', 'wellness_appt', 'time_back_home', 'talk_to_concierge')),
  note TEXT NOT NULL DEFAULT '',
  shift_protection TEXT
    CHECK (shift_protection IS NULL OR shift_protection IN ('yes', 'no', 'not_applicable')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_wellness_checkins_user_id_idx
  ON hop_wellness_checkins (user_id);

CREATE INDEX IF NOT EXISTS hop_wellness_checkins_created_at_idx
  ON hop_wellness_checkins (created_at DESC);

-- ── HOP ConciergeHub (2026-07-16): a third role, 'concierge', alongside 'user'/'admin' ────
-- Concierges fulfill requests they're assigned to (via the existing hop_service_requests
-- .handled_by column); admins manage concierge accounts. Not a self-serve signup role — see
-- docs/hop/architecture.md ("ConciergeHub") and api/hop/admin/concierges.ts.
ALTER TABLE hop_users DROP CONSTRAINT IF EXISTS hop_users_role_check;
ALTER TABLE hop_users ADD CONSTRAINT hop_users_role_check
  CHECK (role IN ('user', 'admin', 'concierge'));

-- Concierge profile — bio/showcase content a concierge builds about themselves. One row per
-- concierge account, created lazily on first save (an admin-invited concierge with no profile
-- yet still logs in fine — see api/hop/concierge.ts).
CREATE TABLE IF NOT EXISTS hop_concierge_profiles (
  user_id UUID PRIMARY KEY REFERENCES hop_users (id) ON DELETE CASCADE,
  headline TEXT NOT NULL DEFAULT '',
  bio TEXT NOT NULL DEFAULT '',
  specialties TEXT[] NOT NULL DEFAULT '{}',
  years_experience INT,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Async note/message thread on a request, visible to the HOP user who made it and the
-- concierge assigned to it (plus any admin). Deliberately separate from
-- hop_service_request_status_history, which stays admin/staff-only and is never shown to
-- members raw (see "Dispatch workflow" above) — this table is always user-visible by design.
-- Polling-based (no websockets), matching the existing ride-location tracker's setInterval
-- pattern. Append-only; no read-receipt tracking in Phase 1.
CREATE TABLE IF NOT EXISTS hop_request_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES hop_service_requests (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_request_messages_request_id_idx
  ON hop_request_messages (request_id, created_at);

-- ── HOP Phase 1 (2026-07-23): click-to-call, acceptance, ratings, direct messaging,
-- on-duty roster — see docs/hop/architecture.md ("Phase 1 quick wins") for the full shape.

-- Click-to-call/text/email needs a real phone number; none existed before this pass.
-- default_shift_end_time is the minimal viable "shift schedule" (see hop_duty_log below) —
-- a per-user default, not a real per-day scheduling system.
ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS phone TEXT NOT NULL DEFAULT '';
ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS default_shift_end_time TIME;

-- Acceptance/acknowledgment: kept as its own column, not a new status value, so
-- isValidStatusTransition()/nextValidStatuses() in api/_lib/hopRequestWorkflow.ts don't need
-- to change — a request can be 'assigned' with or without accepted_at set, and the workflow's
-- own step-sequence logic is untouched. See requiresAcceptance() in hopRequestWorkflow.ts.
ALTER TABLE hop_service_requests ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;

-- One rating per completed request, given by the member who made it, about the concierge/admin
-- who fulfilled it. UNIQUE on request_id enforces "exactly one rating."
CREATE TABLE IF NOT EXISTS hop_concierge_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE REFERENCES hop_service_requests (id) ON DELETE CASCADE,
  concierge_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  rated_by UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  stars INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  comment TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_concierge_ratings_concierge_id_idx
  ON hop_concierge_ratings (concierge_id);

-- Admin <-> member direct messaging, not tied to a service request — deliberately separate
-- from hop_request_messages above. Threaded by the member's user id: any admin can read/post
-- into a given member's single thread ("admin" is a role here, not one specific counterparty).
CREATE TABLE IF NOT EXISTS hop_direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_direct_messages_thread_user_id_idx
  ON hop_direct_messages (thread_user_id, created_at);

-- Self-toggle on/off duty clock-in log — the "who's working today" signal for the admin
-- roster widget, and the raw data the future Facility-portal overtime metric (Phase 2) will
-- read from. "On duty today" = a row with clock_out_at IS NULL, or clock_in_at::date =
-- CURRENT_DATE. Deliberately not GPS/biometric-verified — self-reported, like the rest of
-- this table's neighbors (hop_wellness_checkins, hop_service_requests).
CREATE TABLE IF NOT EXISTS hop_duty_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES hop_users (id) ON DELETE CASCADE,
  clock_in_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  clock_out_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS hop_duty_log_user_id_idx
  ON hop_duty_log (user_id, clock_in_at DESC);

-- ── HOP number + points ledger (2026-08-09) ────────────────────────────────
-- See docs/hop/architecture.md for the full shape.

-- A permanent, human-readable account identifier (e.g. "HOP001"), usable as an alternate login
-- identifier alongside email (see handleLogin in api/hop/auth.ts) and as the invite code an admin
-- hands a new account. Backed by a real sequence so concurrent inserts never collide and no
-- retry logic is needed anywhere that creates a hop_users row. Format degrades gracefully past
-- 999 accounts (HOP1000, ...) rather than truncating or erroring — an accepted limitation, not a
-- bug. Existing rows are backfilled once via scripts/backfill-hop-numbers.mjs, not here (schema.sql
-- is DDL-only; that script assigns real sequence values in created_at order).
CREATE SEQUENCE IF NOT EXISTS hop_number_seq START 1;

ALTER TABLE hop_users ADD COLUMN IF NOT EXISTS hop_number TEXT
  DEFAULT ('HOP' || LPAD(nextval('hop_number_seq')::text, 3, '0'));

CREATE UNIQUE INDEX IF NOT EXISTS hop_users_hop_number_idx ON hop_users (hop_number);

-- Append-only points ledger. Reduced scope for this cycle: only 'admin_award'/'concierge_award'
-- are ever written (see api/hop/rewards.ts) — the other source values are kept in the CHECK set
-- as forward-compatible plumbing for a future redemption/auto-earning cycle (docs/hop/roadmap.md),
-- not implemented behavior today. request_id lets a future redemption tie a negative-delta row to
-- the request it paid for; unused by anything that writes to this table yet.
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

CREATE INDEX IF NOT EXISTS hop_points_ledger_user_id_idx
  ON hop_points_ledger (user_id, created_at DESC);
