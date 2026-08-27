-- ============================================================================
-- MIGRACION 01 — CONTROL DE APERTURA DE DIAS
-- ============================================================================
-- Objetivo: que un participante SOLO pueda ver y responder el dia que el
-- moderador haya abierto. Asi nadie adelanta el Dia 3 desde su casa.
--
-- El bloqueo es de VERDAD: no depende del frontend, esta en las politicas RLS.
-- Aunque alguien llame a la API directamente, Postgres rechaza el insert.
--
-- Ejecutar en: Supabase Dashboard > SQL Editor > New query
-- Es idempotente.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. APERTURA POR SEDE (o global)
--    campus = null  -> la regla aplica a TODAS las sedes
--    campus = 'merida' -> solo Merida (permite abrir el Dia 2 en una sede
--                         que va mas rapida sin afectar a la otra)
-- ---------------------------------------------------------------------------
create table if not exists public.day_access (
  id         uuid primary key default gen_random_uuid(),
  campus     public.campus,
  day        smallint not null check (day between 1 and 4),
  is_open    boolean  not null default false,
  opened_by  uuid references public.profiles(id) on delete set null,
  opened_at  timestamptz,
  updated_at timestamptz not null default now()
);

comment on table public.day_access is
  'Which Reading Lab days are open. Staff control this from the moderator panel.';

-- Una sola fila por (sede, dia). Dos indices porque NULL no colisiona consigo mismo.
create unique index if not exists day_access_campus_day_idx
  on public.day_access (campus, day) where campus is not null;
create unique index if not exists day_access_global_day_idx
  on public.day_access (day) where campus is null;

-- ---------------------------------------------------------------------------
-- 2. EXCEPCION INDIVIDUAL
--    Para el docente que falto un dia y necesita ponerse al dia, o para
--    cerrarle un dia concreto a alguien.
-- ---------------------------------------------------------------------------
create table if not exists public.participant_day_access (
  user_id    uuid     not null references public.profiles(id) on delete cascade,
  day        smallint not null check (day between 1 and 4),
  is_open    boolean  not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (user_id, day)
);

comment on table public.participant_day_access is
  'Individual exceptions override day_access rules.';

-- ---------------------------------------------------------------------------
-- 3. SEMILLA: Dia 1 abierto, Dias 2-4 cerrados (reglas globales)
-- ---------------------------------------------------------------------------
insert into public.day_access (campus, day, is_open, opened_at)
select null::public.campus, d::smallint, d = 1, case when d = 1 then now() end
from generate_series(1, 4) as d
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 4. LA FUNCION QUE DECIDE
--    Prioridad: excepcion individual > regla de su sede > regla global > cerrado
--    El staff (moderador/admin) siempre tiene todo abierto.
-- ---------------------------------------------------------------------------
create or replace function public.day_is_open(p_user uuid, p_day smallint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  with me as (
    select campus, role from public.profiles where id = p_user
  )
  select coalesce(
    -- 0) el staff nunca esta bloqueado
    (select true from me where role in ('moderator', 'admin')),
    -- 1) excepcion individual
    (select pda.is_open from public.participant_day_access pda
      where pda.user_id = p_user and pda.day = p_day),
    -- 2) regla de su sede
    (select da.is_open from public.day_access da, me
      where da.day = p_day and da.campus is not null and da.campus = me.campus),
    -- 3) regla global
    (select da.is_open from public.day_access da
      where da.day = p_day and da.campus is null),
    -- 4) por defecto, cerrado
    false
  );
$$;

revoke all on function public.day_is_open(uuid, smallint) from public;
grant execute on function public.day_is_open(uuid, smallint) to authenticated;

-- Atajo comodo para el cliente: "que dias tengo abiertos yo?"
create or replace function public.my_open_days()
returns smallint[]
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(array_agg(d::smallint order by d), '{}'::smallint[])
  from generate_series(1, 4) as d
  where public.day_is_open(auth.uid(), d::smallint);
$$;

revoke all on function public.my_open_days() from public;
grant execute on function public.my_open_days() to authenticated;

-- ---------------------------------------------------------------------------
-- 4b. ESCRITURA DESDE EL PANEL (RPC)
-- ---------------------------------------------------------------------------
-- POR QUE UNA FUNCION Y NO UN UPSERT DIRECTO:
-- day_access usa indices unicos PARCIALES (uno para campus is null, otro para
-- campus not null) porque en SQL un NULL no colisiona consigo mismo. Postgres
-- NO puede inferir un indice parcial en "on conflict (campus, day)": falla con
-- "there is no unique or exclusion constraint matching the ON CONFLICT
-- specification". Con esta funcion la logica es explicita y funciona en
-- cualquier version de Postgres, en una sola llamada.
create or replace function public.set_day_access(
  p_campus public.campus,
  p_day    smallint,
  p_open   boolean
)
returns public.day_access
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.day_access;
begin
  if not public.is_staff() then
    raise exception 'Only staff can open or close days.' using errcode = '42501';
  end if;
  if p_day < 1 or p_day > 4 then
    raise exception 'Invalid day: %', p_day;
  end if;

  update public.day_access
     set is_open   = p_open,
         opened_by = auth.uid(),
         opened_at = case when p_open then now() else null end
   where day = p_day
     and campus is not distinct from p_campus   -- trata NULL = NULL
  returning * into result;

  if not found then
    insert into public.day_access (campus, day, is_open, opened_by, opened_at)
    values (p_campus, p_day, p_open, auth.uid(), case when p_open then now() end)
    returning * into result;
  end if;

  return result;
end $$;

revoke all on function public.set_day_access(public.campus, smallint, boolean) from public;
grant execute on function public.set_day_access(public.campus, smallint, boolean) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. RLS
-- ---------------------------------------------------------------------------
alter table public.day_access             enable row level security;
alter table public.participant_day_access enable row level security;

-- Todo el mundo autenticado puede LEER que dias estan abiertos
-- (el participante necesita saberlo para pintar los candados).
drop policy if exists "day_access_read_all" on public.day_access;
create policy "day_access_read_all" on public.day_access
  for select using (auth.uid() is not null);

drop policy if exists "day_access_write_staff" on public.day_access;
create policy "day_access_write_staff" on public.day_access
  for all using (public.is_staff()) with check (public.is_staff());

drop policy if exists "pda_read_own_or_staff" on public.participant_day_access;
create policy "pda_read_own_or_staff" on public.participant_day_access
  for select using (user_id = auth.uid() or public.is_staff());

drop policy if exists "pda_write_staff" on public.participant_day_access;
create policy "pda_write_staff" on public.participant_day_access
  for all using (public.is_staff()) with check (public.is_staff());

-- ---------------------------------------------------------------------------
-- 6. EL CANDADO REAL: responses solo se puede escribir si el dia esta abierto
-- ---------------------------------------------------------------------------
drop policy if exists "responses_rw_own"      on public.responses;
drop policy if exists "responses_select_own"  on public.responses;
drop policy if exists "responses_insert_own"  on public.responses;
drop policy if exists "responses_update_own"  on public.responses;
drop policy if exists "responses_delete_own"  on public.responses;

-- Leer lo suyo: siempre (asi ve lo que ya escribio aunque el dia se cierre).
create policy "responses_select_own" on public.responses
  for select using (user_id = auth.uid());

-- Escribir: solo si el dia esta abierto para el.
create policy "responses_insert_own" on public.responses
  for insert with check (user_id = auth.uid() and public.day_is_open(auth.uid(), day));

create policy "responses_update_own" on public.responses
  for update using (user_id = auth.uid() and public.day_is_open(auth.uid(), day))
           with check (user_id = auth.uid() and public.day_is_open(auth.uid(), day));

create policy "responses_delete_own" on public.responses
  for delete using (user_id = auth.uid() and public.day_is_open(auth.uid(), day));

-- ---------------------------------------------------------------------------
-- 7. Trigger de updated_at
-- ---------------------------------------------------------------------------
drop trigger if exists trg_day_access_updated on public.day_access;
create trigger trg_day_access_updated before update on public.day_access
  for each row execute function public.set_updated_at();

drop trigger if exists trg_pda_updated on public.participant_day_access;
create trigger trg_pda_updated before update on public.participant_day_access
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 8. Realtime: el candado se abre en la pantalla del docente sin refrescar
-- ---------------------------------------------------------------------------
do $$ begin
  alter publication supabase_realtime add table public.day_access;
exception when duplicate_object then null; end $$;
do $$ begin
  alter publication supabase_realtime add table public.participant_day_access;
exception when duplicate_object then null; end $$;

-- ============================================================================
-- COMO SE USA (el moderador no necesita SQL: lo hace desde /moderator/dias)
--   Abrir el Dia 2 para todas las sedes:
--     select public.set_day_access(null, 2::smallint, true);
--   Abrir el Dia 3 solo en El Vigia:
--     select public.set_day_access('el_vigia', 3::smallint, true);
--   Cerrar el Dia 1:
--     select public.set_day_access(null, 1::smallint, false);
-- ============================================================================
