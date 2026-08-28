-- ============================================================================
-- MOA EDUCATION | IMMERSIVE SUMMER CAMP 2026
-- Reading Lab - Routes 1 and 2 (Teachers A2/B1 + B2/C1)
-- Esquema completo para Supabase (PostgreSQL 15+)
-- Ejecutar TODO este archivo en: Supabase Dashboard > SQL Editor > New query
-- Es idempotente: puedes volver a ejecutarlo sin romper nada.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- 1. TIPOS
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.campus as enum ('merida', 'el_vigia');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.user_role as enum ('participant', 'moderator', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.checkpoint_status as enum ('pending', 'approved', 'needs_work');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. PERFILES  (1:1 con auth.users)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text        not null,
  email         text,
  campus        public.campus,
  role          public.user_role not null default 'participant',
  group_name    text,                       -- opcional: "Grupo A", "Aula 3"...
  workbook_route text not null default 'a2_b1' check (workbook_route in ('a2_b1', 'b2_c1')),
  tutorial_seen_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

comment on table public.profiles is 'Participants (teachers) and staff (moderators/admins) in the camp.';

-- Mantiene schema.sql idempotente también sobre instalaciones anteriores.
alter table public.profiles
  add column if not exists tutorial_seen_at timestamptz;

-- ---------------------------------------------------------------------------
-- 3. RESPUESTAS DEL WORKBOOK
--    El contenido del workbook (dias/partes/campos) vive en el codigo
--    (src/lib/workbook). Aqui solo guardamos el valor de cada campo.
--    value es jsonb para soportar texto, tablas y matrices:
--      texto  -> {"text": "..."}
--      tabla  -> {"rows": [["a","b"],["c","d"]]}
--      matriz -> {"Reflection": "I already do this", ...}
--      checks -> {"checked": ["specific","realistic"]}
-- ---------------------------------------------------------------------------
create table if not exists public.responses (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid        not null references public.profiles(id) on delete cascade,
  day         smallint    not null check (day between 1 and 4),
  section_id  text        not null,          -- ej. 'd1_part1'
  field_key   text        not null,          -- ej. 'd1_p1_q1'  (unico en todo el workbook)
  field_label text,                          -- copia del enunciado (facilita el reporte de IA)
  value       jsonb       not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (user_id, field_key)
);

create index if not exists responses_user_day_idx on public.responses (user_id, day);
create index if not exists responses_day_idx      on public.responses (day);

-- ---------------------------------------------------------------------------
-- 4. CHECKPOINTS (firma del moderador)
-- ---------------------------------------------------------------------------
create table if not exists public.checkpoints (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid     not null references public.profiles(id) on delete cascade,
  day                smallint not null check (day between 1 and 4),
  checkpoint_number  smallint not null check (checkpoint_number between 1 and 5),
  status             public.checkpoint_status not null default 'pending',
  items_checked      jsonb    not null default '[]'::jsonb,  -- ["Reflection completed", ...]
  moderator_id       uuid     references public.profiles(id) on delete set null,
  moderator_initials text,
  comments           text,
  approved_at        timestamptz,
  submitted_at       timestamptz,
  notification_sent_at timestamptz,
  submission_count   integer not null default 0,
  updated_at         timestamptz not null default now(),
  unique (user_id, day, checkpoint_number)
);

create index if not exists checkpoints_user_idx on public.checkpoints (user_id);

-- ---------------------------------------------------------------------------
-- 5. REPORTES GENERADOS POR IA (evaluador pedagogico)
-- ---------------------------------------------------------------------------
create table if not exists public.ai_reports (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  requested_by      uuid references public.profiles(id) on delete set null,
  model             text not null,
  summary           text,
  strengths         jsonb not null default '[]'::jsonb,  -- [{title, evidence}]
  growth_areas      jsonb not null default '[]'::jsonb,  -- [{title, evidence, suggestion}]
  evidence_use      smallint check (evidence_use between 1 and 5),
  pedagogical_depth smallint check (pedagogical_depth between 1 and 5),
  reflection_depth  smallint check (reflection_depth between 1 and 5),
  next_step         text,
  moderator_notes   text,
  raw               jsonb,
  generated_at      timestamptz not null default now()
);

create index if not exists ai_reports_user_idx on public.ai_reports (user_id, generated_at desc);

-- ---------------------------------------------------------------------------
-- 6. REGISTRO DE USO DE IA POR EL PARTICIPANTE (evidencia de IA externa)
--    Permite al moderador ver COMO se uso la IA ("Read first. Think second.")
-- ---------------------------------------------------------------------------
create table if not exists public.ai_interactions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  day        smallint,
  section_id text,
  prompt     text not null,
  response   text,
  created_at timestamptz not null default now()
);

create index if not exists ai_interactions_user_idx on public.ai_interactions (user_id, created_at desc);


-- ---------------------------------------------------------------------------
-- 6b. TIEMPO ACUMULADO DENTRO DE CADA LAB
--     Cada entrada crea una sesión. last_seen_at limita sesiones que hayan
--     quedado abiertas por cierre brusco del navegador.
-- ---------------------------------------------------------------------------
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
  on public.lab_time_sessions (user_id) where ended_at is null;

-- ---------------------------------------------------------------------------
-- 7. TRIGGERS
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_profiles_updated    on public.profiles;
drop trigger if exists trg_responses_updated   on public.responses;
drop trigger if exists trg_checkpoints_updated on public.checkpoints;

create trigger trg_profiles_updated    before update on public.profiles    for each row execute function public.set_updated_at();
create trigger trg_responses_updated   before update on public.responses   for each row execute function public.set_updated_at();
create trigger trg_checkpoints_updated before update on public.checkpoints for each row execute function public.set_updated_at();

-- Crea el perfil automaticamente cuando nace el usuario en auth.users.
-- Los metadatos llegan desde supabase.auth.signUp({ options: { data: {...} } }).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  requested_route text;
begin
  requested_route := coalesce(new.raw_user_meta_data ->> 'workbook_route', 'a2_b1');
  if requested_route not in ('a2_b1', 'b2_c1') then
    requested_route := 'a2_b1';
  end if;

  insert into public.profiles (id, full_name, email, campus, role, workbook_route)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    new.email,
    nullif(new.raw_user_meta_data ->> 'campus', '')::public.campus,
    'participant',
    requested_route
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 8. HELPER DE ROL (security definer -> evita recursion infinita en las RLS)
-- ---------------------------------------------------------------------------
create or replace function public.is_staff()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role in ('moderator', 'admin')
  );
$$;

revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ---------------------------------------------------------------------------
-- 9. ROW LEVEL SECURITY
--    Regla general: el participante solo ve/edita LO SUYO.
--                   el staff ve TODO y firma los checkpoints.
-- ---------------------------------------------------------------------------
alter table public.profiles        enable row level security;
alter table public.responses       enable row level security;
alter table public.checkpoints     enable row level security;
alter table public.ai_reports      enable row level security;
alter table public.ai_interactions enable row level security;
alter table public.lab_time_sessions enable row level security;

-- profiles
drop policy if exists "profiles_select_own_or_staff" on public.profiles;
create policy "profiles_select_own_or_staff" on public.profiles
  for select using (id = auth.uid() or public.is_staff());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (id = auth.uid()) with check (id = auth.uid() and role = 'participant');

drop policy if exists "profiles_update_staff" on public.profiles;
create policy "profiles_update_staff" on public.profiles
  for update using (public.is_staff()) with check (public.is_staff());

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self" on public.profiles
  for insert with check (id = auth.uid());

-- responses
-- El bloqueo de dias vive en migration_01_day_access.sql, que sustituye esta
-- politica por otra que ademas comprueba que el dia este ABIERTO.
-- El bloque de abajo hace que el ORDEN DE EJECUCION NO IMPORTE: si day_access
-- ya existe, este archivo no toca las politicas de responses. Asi, volver a
-- ejecutar schema.sql sobre una base ya migrada no reabre los cuatro dias.
do $$
begin
  if to_regclass('public.day_access') is null then
    -- Primera instalacion: politica simple (aun no hay control de dias).
    execute 'drop policy if exists "responses_rw_own" on public.responses';
    execute 'create policy "responses_rw_own" on public.responses
               for all using (user_id = auth.uid()) with check (user_id = auth.uid())';
  else
    raise notice 'day_access exists: current day-locking policies are preserved.';
  end if;
end $$;

drop policy if exists "responses_read_staff" on public.responses;
create policy "responses_read_staff" on public.responses
  for select using (public.is_staff());

-- checkpoints
drop policy if exists "checkpoints_read_own_or_staff" on public.checkpoints;
create policy "checkpoints_read_own_or_staff" on public.checkpoints
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists "checkpoints_write_staff" on public.checkpoints;
create policy "checkpoints_write_staff" on public.checkpoints
  for all using (public.is_staff()) with check (public.is_staff());

-- ai_reports (el participante puede leer el suyo; solo staff/servidor escribe)
drop policy if exists "ai_reports_read_own_or_staff" on public.ai_reports;
create policy "ai_reports_read_own_or_staff" on public.ai_reports
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists "ai_reports_write_staff" on public.ai_reports;
create policy "ai_reports_write_staff" on public.ai_reports
  for all using (public.is_staff()) with check (public.is_staff());

-- ai_interactions
drop policy if exists "ai_interactions_insert_own" on public.ai_interactions;
create policy "ai_interactions_insert_own" on public.ai_interactions
  for insert with check (user_id = auth.uid());

drop policy if exists "ai_interactions_read_own_or_staff" on public.ai_interactions;
create policy "ai_interactions_read_own_or_staff" on public.ai_interactions
  for select using (user_id = auth.uid() or public.is_staff());


-- lab_time_sessions
-- El contador se escribe con service_role y solo el staff puede leerlo.
drop policy if exists "lab_time_read_own_or_staff" on public.lab_time_sessions;
drop policy if exists "lab_time_read_staff" on public.lab_time_sessions;
create policy "lab_time_read_staff" on public.lab_time_sessions
  for select using (public.is_staff());

-- ---------------------------------------------------------------------------
-- 10. VISTA DE PROGRESO (alimenta el dashboard del moderador)
-- ---------------------------------------------------------------------------
-- Devuelve true si la respuesta no esta vacia (texto, tabla o matriz).
create or replace function public.has_content(v jsonb)
returns boolean language sql immutable as $$
  select coalesce(
    length(btrim(coalesce(v ->> 'text', ''))) > 0
    or jsonb_array_length(coalesce(v -> 'checked', '[]'::jsonb)) > 0
    or exists (
      select 1 from jsonb_array_elements(coalesce(v -> 'rows', '[]'::jsonb)) row_el,
                    jsonb_array_elements_text(row_el) cell
      where btrim(cell) <> ''
    )
    or exists (
      select 1 from jsonb_each_text(case when jsonb_typeof(v) = 'object' then v else '{}'::jsonb end) kv
      where kv.key not in ('text','rows','checked') and btrim(kv.value) <> ''
    ),
  false);
$$;

drop view if exists public.participant_progress;
create view public.participant_progress
with (security_invoker = true) as
select
  p.id,
  p.full_name,
  p.campus,
  p.group_name,
  p.workbook_route,
  count(r.id) filter (where r.day = 1 and public.has_content(r.value)) as day1_answers,
  count(r.id) filter (where r.day = 2 and public.has_content(r.value)) as day2_answers,
  count(r.id) filter (where r.day = 3 and public.has_content(r.value)) as day3_answers,
  count(r.id) filter (where r.day = 4 and public.has_content(r.value)) as day4_answers,
  (select count(*) from public.checkpoints c
     where c.user_id = p.id and c.status = 'approved') as checkpoints_approved,
  (select count(*) from public.checkpoints c
     where c.user_id = p.id and c.status = 'pending' and c.submitted_at is not null) as checkpoints_pending_review,
  (select max(generated_at) from public.ai_reports a where a.user_id = p.id) as last_report_at,
  max(r.updated_at) as last_activity
from public.profiles p
left join public.responses r on r.user_id = p.id
where p.role = 'participant'
group by p.id;

-- ---------------------------------------------------------------------------
-- 11. REALTIME (para que el dashboard se actualice solo)
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.responses;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.checkpoints;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.ai_reports;
exception when duplicate_object then null; end $$;

do $$ begin
  alter publication supabase_realtime add table public.lab_time_sessions;
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 12. SIGUIENTE PASO
-- ---------------------------------------------------------------------------
-- Ejecuta ahora, en este orden:
--   1) supabase/migration_01_day_access.sql   (bloqueo de dias por moderador)
--   2) supabase/seed_staff.sql                (convertir usuarios en moderadores)

-- ============================================================================
-- FIN
-- ============================================================================
