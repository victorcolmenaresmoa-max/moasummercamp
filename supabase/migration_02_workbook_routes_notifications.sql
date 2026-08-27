-- ============================================================================
-- MOA EDUCATION | SUMMER CAMP 2026
-- MIGRATION 02 — Rutas A2/B1 + B2/C1 y avisos de checkpoints
-- Ejecutar UNA VEZ en Supabase Dashboard > SQL Editor > New query.
-- Es idempotente: se puede volver a ejecutar.
-- ============================================================================

-- 1) Ruta asignada a cada participante. Los usuarios existentes quedan A2/B1.
alter table public.profiles
  add column if not exists workbook_route text not null default 'a2_b1';

update public.profiles
set workbook_route = 'a2_b1'
where workbook_route is null or workbook_route not in ('a2_b1', 'b2_c1');

do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_workbook_route_check'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_workbook_route_check
      check (workbook_route in ('a2_b1', 'b2_c1'));
  end if;
end $$;

-- 2) Estado de envío/notificación del checkpoint.
alter table public.checkpoints
  add column if not exists submitted_at timestamptz,
  add column if not exists notification_sent_at timestamptz,
  add column if not exists submission_count integer not null default 0;

-- 3) El trigger de alta ahora guarda la ruta elegida en el registro.
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

-- 4) Dashboard del moderador: incluye ruta y checkpoints pendientes de revisión.
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

-- Los participantes NO reciben permisos de escritura directa sobre checkpoints.
-- /api/checkpoints/submit valida la sesión y escribe con service_role en servidor.

-- ============================================================================
-- FIN MIGRATION 02
-- ============================================================================
