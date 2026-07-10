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
