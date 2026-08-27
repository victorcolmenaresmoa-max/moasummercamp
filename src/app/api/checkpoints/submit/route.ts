import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { getDay, normalizeWorkbookRoute } from '@/lib/workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Guarda el checkpoint y responde inmediatamente.
 *
 * La notificacion de Telegram se hace en una segunda llamada no bloqueante
 * desde el cliente. Antes el usuario esperaba hasta 8 segundos por Telegram
 * aun cuando el checkpoint ya estaba guardado correctamente.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const dayNumber = Number(body?.day);
  const checkpointNumber = Number(body?.checkpointNumber);
  if (!Number.isInteger(dayNumber) || !Number.isInteger(checkpointNumber)) {
    return NextResponse.json({ error: 'Invalid checkpoint.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server.' }, { status: 500 });
  }

  const admin = createAdminClient();

  // Estas dos lecturas no dependen entre si: hacerlas en paralelo elimina una
  // vuelta completa a Supabase del camino critico del boton.
  const [{ data: profile }, { data: existing }] = await Promise.all([
    admin
      .from('profiles')
      .select('id, role, workbook_route')
      .eq('id', userId)
      .single(),
    admin
      .from('checkpoints')
      .select('id, status, items_checked, moderator_id, moderator_initials, comments, submission_count')
      .eq('user_id', userId)
      .eq('day', dayNumber)
      .eq('checkpoint_number', checkpointNumber)
      .maybeSingle(),
  ]);

  if (!profile || profile.role !== 'participant') {
    return NextResponse.json({ error: 'Only participants can submit checkpoints.' }, { status: 403 });
  }

  const route = normalizeWorkbookRoute(profile.workbook_route);
  const day = getDay(dayNumber, route);
  const section = day?.sections.find((s) => s.checkpoint?.number === checkpointNumber);
  if (!day || !section?.checkpoint) {
    return NextResponse.json({ error: 'This checkpoint does not belong to your workbook.' }, { status: 400 });
  }

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'This checkpoint has already been approved.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextCount = (existing?.submission_count ?? 0) + 1;
  const { data: saved, error: saveError } = await admin
    .from('checkpoints')
    .upsert(
      {
        user_id: userId,
        day: dayNumber,
        checkpoint_number: checkpointNumber,
        status: 'pending',
        items_checked: existing?.items_checked ?? [],
        moderator_id: existing?.moderator_id ?? null,
        moderator_initials: existing?.moderator_initials ?? null,
        comments: existing?.comments ?? null,
        approved_at: null,
        submitted_at: now,
        notification_sent_at: null,
        submission_count: nextCount,
      },
      { onConflict: 'user_id,day,checkpoint_number' },
    )
    .select('id, day, checkpoint_number, status, submitted_at, submission_count')
    .single();

  if (saveError || !saved) {
    return NextResponse.json({ error: saveError?.message ?? 'The checkpoint could not be saved.' }, { status: 500 });
  }

  return NextResponse.json({ checkpoint: saved });
}
