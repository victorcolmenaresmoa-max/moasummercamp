-- ============================================================================
-- PASO 2 (despues de schema.sql): convertir usuarios en MODERADORES
-- ============================================================================
-- Los moderadores se crean como cualquier usuario (Dashboard > Authentication >
-- Users > "Add user" con email y password, o registrandose en /signup).
-- Despues ejecuta esto para elevarlos de rol. Nunca dejes que el rol se asigne
-- desde el cliente: el trigger handle_new_user() siempre crea 'participant'.
-- ============================================================================

update public.profiles
set role = 'moderator', full_name = coalesce(full_name, 'Academy Specialist')
where email in (
  'moderador1@moaeducation.com',
  'moderador2@moaeducation.com'
);

-- Un administrador (ve todo + puede lanzar reportes de IA masivos)
update public.profiles
set role = 'admin'
where email = 'director@moaeducation.com';

-- Verificacion
select id, full_name, email, role, campus from public.profiles order by role, full_name;

-- ---------------------------------------------------------------------------
-- OPCIONAL: participantes de prueba (solo para QA local).
-- No se pueden insertar en public.profiles sin su usuario en auth.users,
-- asi que crealos desde el Dashboard o desde /signup y luego ajusta la sede:
-- ---------------------------------------------------------------------------
-- update public.profiles set campus = 'merida'   where email = 'profe1@correo.com';
-- update public.profiles set campus = 'el_vigia' where email = 'profe2@correo.com';
