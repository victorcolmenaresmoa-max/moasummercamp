import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Elimina por completo la cuenta de un participante.
 *
 * QUE BORRA EXACTAMENTE
 * ---------------------
 * Se borra el usuario de auth.users y Postgres hace el resto en cascada:
 *
 *   auth.users
 *     └── profiles                  (on delete cascade)
 *           ├── responses           (on delete cascade)
 *           ├── checkpoints         (on delete cascade)
 *           ├── ai_reports          (on delete cascade)
 *           ├── ai_interactions     (on delete cascade)
 *           └── participant_day_access (on delete cascade)
 *
 * Como el correo deja de existir en auth.users, esa misma persona puede
 * volver a registrarse con el mismo correo y empezar de cero.
 *
 * ES IRREVERSIBLE: no hay papelera. El workbook completo desaparece.
 *
 * QUIEN PUEDE HACERLO
 * -------------------
 * Solo el rol 'admin'. Un moderador NO puede borrar a nadie: durante el camp
 * tiene la sesion abierta en el aula y un clic accidental destruiria el
 * trabajo de un docente sin vuelta atras.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('id, role').eq('id', user.id).single();
  if (!me || me.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo un administrador puede eliminar cuentas.' },
      { status: 403 },
    );
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => ({}) as any);
  const targetId: string | undefined = body?.userId;
  const confirmName: string = String(body?.confirmName ?? '');

  if (!targetId) return NextResponse.json({ error: 'Falta el identificador.' }, { status: 400 });

  // No puedes borrarte a ti mismo: te quedarias sin acceso al panel.
  if (targetId === me.id) {
    return NextResponse.json({ error: 'No puedes eliminar tu propia cuenta.' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: target } = await admin
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', targetId)
    .single();
  if (!target) return NextResponse.json({ error: 'Esa cuenta ya no existe.' }, { status: 404 });

  // Proteccion del staff: primero hay que bajarlo a participante.
  if (target.role !== 'participant') {
    return NextResponse.json(
      {
        error: `${target.full_name} es ${target.role}. Cambia su rol a participante antes de eliminarlo.`,
      },
      { status: 400 },
    );
  }

  // El nombre tecleado debe coincidir: evita borrar la fila equivocada.
  const normalize = (s: string) => s.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
  if (normalize(confirmName) !== normalize(target.full_name)) {
    return NextResponse.json(
      { error: 'El nombre escrito no coincide. No se ha eliminado nada.' },
      { status: 400 },
    );
  }

  const { error } = await admin.auth.admin.deleteUser(targetId);
  if (error) {
    console.error('[admin/delete-participant]', error);
    return NextResponse.json({ error: `No se pudo eliminar: ${error.message}` }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: target.full_name });
}
