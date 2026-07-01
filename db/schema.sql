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
