import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { CAMPUS_LABELS, getDay, normalizeWorkbookRoute, WORKBOOK_ROUTE_LABELS } from '@/lib/workbook';
import { escapeTelegramHtml, sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 15;

/**
 * Envia la alerta despues de que el checkpoint ya fue confirmado al usuario.
 * Esta ruta deliberadamente NO forma parte del tiempo de espera del boton.
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
    return NextResponse.json({ error: 'Server configuration is incomplete.' }, { status: 500 });
  }

  const admin = createAdminClient();
  const [{ data: profile }, { data: checkpoint }] = await Promise.all([
    admin
      .from('profiles')
      .select('full_name, campus, role, workbook_route')
      .eq('id', userId)
      .single(),
    admin
      .from('checkpoints')
      .select('id, submitted_at, notification_sent_at, submission_count')
      .eq('user_id', userId)
      .eq('day', dayNumber)
      .eq('checkpoint_number', checkpointNumber)
      .maybeSingle(),
  ]);

  if (!profile || profile.role !== 'participant' || !checkpoint?.submitted_at) {
    return NextResponse.json({ error: 'Checkpoint not found.' }, { status: 404 });
  }

  // Evita duplicados si el navegador reintenta un request keepalive.
  if (checkpoint.notification_sent_at) {
    return NextResponse.json({ ok: true, alreadySent: true });
  }

  const route = normalizeWorkbookRoute(profile.workbook_route);
  const day = getDay(dayNumber, route);
  if (!day) return NextResponse.json({ error: 'Invalid day.' }, { status: 400 });

  const link = `${new URL(req.url).origin}/moderator/participant/${userId}?day=${dayNumber}#checkpoint-${checkpointNumber}`;
  const routeLabel = WORKBOOK_ROUTE_LABELS[route];
  const campus = profile.campus ? CAMPUS_LABELS[profile.campus] : 'No campus';
  const text = [
    '🔔 <b>Checkpoint ready for review</b>',
    '',
    `<b>Participant:</b> ${escapeTelegramHtml(profile.full_name)}`,
    `<b>Route:</b> ${escapeTelegramHtml(routeLabel)}`,
    `<b>Campus:</b> ${escapeTelegramHtml(campus)}`,
    `<b>Day:</b> ${dayNumber} — ${escapeTelegramHtml(day.title)}`,
    `<b>Checkpoint:</b> ${checkpointNumber}`,
    checkpoint.submission_count > 1 ? `<b>Submission:</b> #${checkpoint.submission_count}` : '',
  ].filter(Boolean).join('\n');

  try {
    const telegram = await sendTelegramMessage({ text, buttonText: 'Open checkpoint', buttonUrl: link });
    if (!telegram.configured) return NextResponse.json({ ok: true, configured: false });
    if (telegram.failed > 0) {
      console.error('[checkpoint-telegram]', telegram.errors);
      return NextResponse.json({ ok: false, sent: telegram.sent, failed: telegram.failed }, { status: 502 });
    }

    await admin.from('checkpoints').update({ notification_sent_at: new Date().toISOString() }).eq('id', checkpoint.id);
    return NextResponse.json({ ok: true, sent: telegram.sent });
  } catch (error) {
    console.error('[checkpoint-telegram]', error);
    return NextResponse.json({ ok: false }, { status: 502 });
  }
}
