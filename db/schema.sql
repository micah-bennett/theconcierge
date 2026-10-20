-- HOP database schema (one Neon Postgres database shared by every deployment).
-- Idempotent: CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS only, never DROP.
-- Apply from the repo root with: npm run db:migrate
--
-- 2026-10 rebuild: the old HOP member app / ConciergeHub tables (hop_users, hop_sessions,
-- hop_service_requests, concierge_requests, ...) still exist in the live database but are no
-- longer created or used by any code. They are left in place on purpose (nothing deleted).
-- The new HOP Portal tables all use the portal_ prefix so they never collide with them.

-- ── Public site: "Start a Conversation" contact form (apps/site/api/inquiry.ts) ──

CREATE TABLE IF NOT EXISTS hop_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  organization TEXT NOT NULL DEFAULT '',
  interest TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS hop_inquiries_created_at_idx
  ON hop_inquiries (created_at DESC);

-- ── HOP Portal (Staff App, Concierge Console, Rep App, Facility View) ─────────
-- Added in Phase 1.
-- Design: docs/portal/architecture.md → Data model. Jobs and requests keep their full detail in
-- JSONB `data` (the starter's Job / StaffRequest shapes); the indexed columns are kept in sync
-- on every write by packages/shared/src/server/store.ts.

CREATE TABLE IF NOT EXISTS portal_facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS portal_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES portal_facilities(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_units_facility_idx ON portal_units (facility_id);

CREATE TABLE IF NOT EXISTS portal_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  password_hash TEXT,
  role TEXT NOT NULL CHECK (role IN ('staff', 'rep', 'console', 'facility_admin')),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  phone TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'invited' CHECK (status IN ('invited', 'active', 'disabled')),
  facility_id UUID REFERENCES portal_facilities(id) ON DELETE SET NULL,
  failed_login_attempts INT NOT NULL DEFAULT 0,
  locked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);
CREATE UNIQUE INDEX IF NOT EXISTS portal_users_email_key ON portal_users (lower(email));
CREATE INDEX IF NOT EXISTS portal_users_role_idx ON portal_users (role);

CREATE TABLE IF NOT EXISTS portal_sessions (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  user_agent TEXT NOT NULL DEFAULT '',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_sessions_user_idx ON portal_sessions (user_id);

CREATE TABLE IF NOT EXISTS portal_password_tokens (
  token_hash TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  purpose TEXT NOT NULL CHECK (purpose IN ('invite', 'reset')),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_password_tokens_user_idx ON portal_password_tokens (user_id);

CREATE TABLE IF NOT EXISTS portal_staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES portal_users(id) ON DELETE CASCADE,
  job_title TEXT NOT NULL DEFAULT '',
  unit_id UUID REFERENCES portal_units(id) ON DELETE SET NULL,
  prefs JSONB NOT NULL DEFAULT '[]'::jsonb,
  consents JSONB NOT NULL DEFAULT '{}'::jsonb,
  points INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One row per claimed earn action per period, so a daily/weekly earn can't be claimed twice.
-- TODO(IT): verify earn events server side before points have any cash value.
CREATE TABLE IF NOT EXISTS portal_point_claims (
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  earn_key TEXT NOT NULL,
  period TEXT NOT NULL,
  points INT NOT NULL,
  claimed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, earn_key, period)
);

CREATE TABLE IF NOT EXISTS portal_requests (
  id TEXT PRIMARY KEY,
  member_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'dispatched', 'completed', 'cancelled')),
  job_id TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_requests_member_idx ON portal_requests (member_id);
CREATE INDEX IF NOT EXISTS portal_requests_status_idx ON portal_requests (status);

CREATE TABLE IF NOT EXISTS portal_jobs (
  id TEXT PRIMARY KEY,
  rep_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  request_id TEXT,
  status TEXT NOT NULL CHECK (status IN ('offer', 'accepted', 'started', 'in_progress', 'completed', 'declined')),
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_jobs_rep_idx ON portal_jobs (rep_id);
CREATE INDEX IF NOT EXISTS portal_jobs_status_idx ON portal_jobs (status);

CREATE TABLE IF NOT EXISTS portal_job_events (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES portal_jobs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  detail JSONB NOT NULL DEFAULT '{}'::jsonb,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_job_events_job_idx ON portal_job_events (job_id, at);

-- Audit trail for every smart door unlock/lock. Required before smart lock access goes live.
CREATE TABLE IF NOT EXISTS portal_door_events (
  id BIGSERIAL PRIMARY KEY,
  job_id TEXT NOT NULL REFERENCES portal_jobs(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  action TEXT NOT NULL CHECK (action IN ('unlock', 'lock')),
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_door_events_job_idx ON portal_door_events (job_id);

-- Facility View source: unit-level totals only, never per person. hour NULL = whole day.
CREATE TABLE IF NOT EXISTS portal_unit_signals (
  unit_id UUID NOT NULL REFERENCES portal_units(id) ON DELETE CASCADE,
  day DATE NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('strain', 'stress', 'missed_breaks', 'requests')),
  hour SMALLINT,
  value NUMERIC NOT NULL,
  group_size INT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS portal_unit_signals_key
  ON portal_unit_signals (unit_id, day, metric, COALESCE(hour, -1));

CREATE TABLE IF NOT EXISTS portal_support_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES portal_facilities(id) ON DELETE CASCADE,
  unit_id UUID NOT NULL REFERENCES portal_units(id) ON DELETE CASCADE,
  actions JSONB NOT NULL,
  sent_by UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'resolved')),
  request_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_support_actions_facility_idx ON portal_support_actions (facility_id, created_at DESC);

-- ── 2026-10 v2: real wellbeing input, messaging, ratings, rewards, games ──────────────────────

-- Staff wellbeing check-ins. Read by the Facility View only in aggregate (per unit, ≥ MIN_GROUP_SIZE
-- distinct people) and only for staff whose `share:totals` consent isn't turned off.
CREATE TABLE IF NOT EXISTS portal_checkins (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  unit_id UUID REFERENCES portal_units(id) ON DELETE SET NULL,
  source TEXT NOT NULL DEFAULT 'daily' CHECK (source IN ('daily', 'pulse')),
  mood SMALLINT CHECK (mood BETWEEN 1 AND 5),
  stress SMALLINT CHECK (stress BETWEEN 1 AND 5),
  took_break BOOLEAN,
  supported SMALLINT CHECK (supported BETWEEN 1 AND 5),
  word TEXT NOT NULL DEFAULT '',
  day DATE NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- One daily check-in and one pulse per person per (ET) day.
CREATE UNIQUE INDEX IF NOT EXISTS portal_checkins_once ON portal_checkins (user_id, source, day);
CREATE INDEX IF NOT EXISTS portal_checkins_unit_day ON portal_checkins (unit_id, day);

-- Message threads. thread_kind/thread_key: 'staff'/<staff user id> (staff ↔ HOP Console),
-- 'rep'/<rep user id> (rep ↔ HQ), 'job'/<job id> (rep ↔ the member, Console can read).
CREATE TABLE IF NOT EXISTS portal_messages (
  id BIGSERIAL PRIMARY KEY,
  thread_kind TEXT NOT NULL CHECK (thread_kind IN ('staff', 'rep', 'job')),
  thread_key TEXT NOT NULL,
  sender_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  sender_role TEXT NOT NULL,
  sender_name TEXT NOT NULL DEFAULT '',
  body TEXT NOT NULL,
  urgent BOOLEAN NOT NULL DEFAULT FALSE,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_messages_thread ON portal_messages (thread_kind, thread_key, at);

CREATE TABLE IF NOT EXISTS portal_message_reads (
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  thread_kind TEXT NOT NULL,
  thread_key TEXT NOT NULL,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, thread_kind, thread_key)
);

-- A member's rating of a completed request (one per request).
CREATE TABLE IF NOT EXISTS portal_ratings (
  request_id TEXT PRIMARY KEY,
  job_id TEXT,
  rep_id UUID REFERENCES portal_users(id) ON DELETE SET NULL,
  member_id UUID REFERENCES portal_users(id) ON DELETE CASCADE,
  stars SMALLINT NOT NULL CHECK (stars BETWEEN 1 AND 5),
  note TEXT NOT NULL DEFAULT '',
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_ratings_rep ON portal_ratings (rep_id);

-- Points spent on a reward. Each redemption also creates a Console request (source 'reward').
CREATE TABLE IF NOT EXISTS portal_redemptions (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  reward_key TEXT NOT NULL,
  points INT NOT NULL,
  request_id TEXT,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_redemptions_user ON portal_redemptions (user_id, at DESC);

-- Learn & Play results: one scored play per game per period (ET day or ISO week).
CREATE TABLE IF NOT EXISTS portal_game_plays (
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  game_key TEXT NOT NULL,
  period TEXT NOT NULL,
  score INT NOT NULL,
  max_score INT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, game_key, period)
);

-- A member's own life reminders (licence renewal, car service...).
CREATE TABLE IF NOT EXISTS portal_life_items (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  due_on DATE,
  done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS portal_life_items_user ON portal_life_items (user_id);

-- "Tell me when" on a Coming soon feature.
CREATE TABLE IF NOT EXISTS portal_interest (
  user_id UUID NOT NULL REFERENCES portal_users(id) ON DELETE CASCADE,
  feature_key TEXT NOT NULL,
  at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, feature_key)
);

ALTER TABLE portal_users ADD COLUMN IF NOT EXISTS availability TEXT NOT NULL DEFAULT 'offline';
ALTER TABLE portal_staff_profiles ADD COLUMN IF NOT EXISTS shift_pattern JSONB;
ALTER TABLE portal_staff_profiles ADD COLUMN IF NOT EXISTS referral_code TEXT;
ALTER TABLE portal_staff_profiles ADD COLUMN IF NOT EXISTS referred_by UUID REFERENCES portal_users(id) ON DELETE SET NULL;
CREATE UNIQUE INDEX IF NOT EXISTS portal_staff_profiles_referral ON portal_staff_profiles (referral_code) WHERE referral_code IS NOT NULL;
