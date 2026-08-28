-- ============================================================================
-- MOA EDUCATION | SUMMER CAMP 2026
-- MIGRATION 03 — Teacher tutorial + accumulated Lab time tracking
-- Run ONCE in Supabase Dashboard > SQL Editor > New query.
-- Idempotent: it is safe to run again.
-- ============================================================================

-- 1) Tutorial completion is stored per teacher, not only in the browser.
alter table public.profiles
  add column if not exists tutorial_seen_at timestamptz;

-- 2) Every entry into a Reading Lab creates one visit/session.
create table if not exists public.lab_time_sessions (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid        not null references public.profiles(id) on delete cascade,
  day          smallint    not null check (day between 1 and 4),
  started_at   timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ended_at     timestamptz,
  created_at   timestamptz not null default now()
);

create index if not exists lab_time_sessions_user_day_idx
  on public.lab_time_sessions (user_id, day, started_at desc);

create index if not exists lab_time_sessions_open_idx
  on public.lab_time_sessions (user_id)
  where ended_at is null;

-- 3) Timer writes are server-only (service role). Only staff can read timer rows.
alter table public.lab_time_sessions enable row level security;

drop policy if exists "lab_time_read_own_or_staff" on public.lab_time_sessions;
drop policy if exists "lab_time_read_staff" on public.lab_time_sessions;
create policy "lab_time_read_staff" on public.lab_time_sessions
  for select using (public.is_staff());

-- 4) Participant-detail moderator screens can update automatically while a Lab is open.
do $$ begin
  alter publication supabase_realtime add table public.lab_time_sessions;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- FIN MIGRATION 03
-- ============================================================================
