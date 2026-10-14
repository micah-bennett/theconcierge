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
-- Added in Phase 1 — see docs/rebuild/phase-1-foundation.md.
