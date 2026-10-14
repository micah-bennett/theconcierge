-- HOP Portal starter schema (Postgres). Apply with: npm run db:schema
-- Jobs keep their full detail in a JSONB column so the starter can evolve quickly.
-- Split into normalized tables (job_events, proofs, door_events) before production.

create table if not exists jobs (
  id          text primary key,
  rep         text not null,
  status      text not null,
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists jobs_rep_idx on jobs (rep);
create index if not exists jobs_status_idx on jobs (status);

create table if not exists staff_requests (
  id          text primary key,
  status      text not null default 'new',
  data        jsonb not null,
  created_at  timestamptz not null default now()
);

-- Audit trail for every door unlock. Required before smart lock access goes live.
create table if not exists door_events (
  id          bigserial primary key,
  job_id      text not null references jobs(id),
  actor       text not null,
  action      text not null,
  at          timestamptz not null default now()
);
