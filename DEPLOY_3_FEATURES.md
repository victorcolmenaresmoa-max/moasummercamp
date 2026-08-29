# Activar las 3 nuevas funciones

Este paquete ya contiene el código completo para:

1. Tutorial inicial para teachers, disponible también desde el botón **Tutorial**.
2. Aviso al intentar salir de un Lab con respuestas pendientes, con acceso directo al primer campo incompleto.
3. Tiempo acumulado individual por teacher y por Lab, visible en el panel de moderador.

## Paso obligatorio en Supabase

Si esta aplicación ya estaba funcionando antes de esta actualización, **no vuelvas a ejecutar `schema.sql` sobre la base existente**.

Abre **Supabase → SQL Editor → New query**, copia todo el contenido de:

`supabase/migration_03_tutorial_exit_timer.sql`

y ejecútalo una sola vez. La migración es idempotente, por lo que repetirla accidentalmente no debería duplicar datos ni tablas.

La migración agrega:

- `profiles.tutorial_seen_at`
- la tabla `lab_time_sessions`
- sus índices y políticas RLS
- Realtime para que el detalle individual del moderador se actualice mientras el teacher está dentro del Lab

## GitHub / Vercel

Después de aplicar la migración, sube el contenido de este paquete a GitHub y despliega normalmente en Vercel. No se agregaron nuevas variables de entorno: se siguen usando las variables que ya requiere el proyecto, incluyendo `SUPABASE_SERVICE_ROLE_KEY` para registrar el tiempo de forma segura desde el servidor.

## Adjustment: optional exit from incomplete Labs

The incomplete-Lab warning now offers three choices: jump to the first missing answer, exit the current Day anyway, or remain in the Day. When the teacher chooses to exit anyway, queued autosaves are flushed first and the original requested action is respected (for example, return to My Labs or sign out). The Lab timer pauses through the existing page-exit tracking.
