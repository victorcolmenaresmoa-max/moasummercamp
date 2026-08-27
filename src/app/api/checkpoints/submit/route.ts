import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CAMPUS_LABELS, getDay, normalizeWorkbookRoute, WORKBOOK_ROUTE_LABELS } from '@/lib/workbook';
import { escapeTelegramHtml, sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

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
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, campus, role, workbook_route')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'participant') {
    return NextResponse.json({ error: 'Only participants can submit checkpoints.' }, { status: 403 });
  }

  const route = normalizeWorkbookRoute(profile.workbook_route);
  const day = getDay(dayNumber, route);
  const section = day?.sections.find((s) => s.checkpoint?.number === checkpointNumber);
  if (!day || !section?.checkpoint) {
    return NextResponse.json({ error: 'This checkpoint does not belong to your workbook.' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('checkpoints')
    .select('*')
    .eq('user_id', user.id)
    .eq('day', dayNumber)
    .eq('checkpoint_number', checkpointNumber)
    .maybeSingle();

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'This checkpoint has already been approved.' }, { status: 409 });
  }

  const now = new Date().toISOString();
  const nextCount = (existing?.submission_count ?? 0) + 1;
  const { data: saved, error: saveError } = await admin
    .from('checkpoints')
    .upsert(
      {
        user_id: user.id,
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
    .select()
    .single();

  if (saveError || !saved) {
    return NextResponse.json({ error: saveError?.message ?? 'The checkpoint could not be saved.' }, { status: 500 });
  }

  const link = `${new URL(req.url).origin}/moderator/participant/${user.id}?day=${dayNumber}#checkpoint-${checkpointNumber}`;
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
    nextCount > 1 ? `<b>Submission:</b> #${nextCount}` : '',
  ].filter(Boolean).join('\n');

  try {
    const telegram = await sendTelegramMessage({
      text,
      buttonText: 'Open checkpoint',
      buttonUrl: link,
    });

    if (!telegram.configured) {
      return NextResponse.json({
        checkpoint: saved,
        warning: 'Checkpoint saved. Telegram notifications are not configured yet.',
      });
    }

    if (telegram.failed > 0) {
      console.error('[checkpoint-telegram]', telegram.errors);
      return NextResponse.json({
        checkpoint: saved,
        warning: `Checkpoint saved. Telegram reached ${telegram.sent} chat(s), but ${telegram.failed} delivery attempt(s) failed.`,
      });
    }

    await admin
      .from('checkpoints')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', saved.id);

    return NextResponse.json({ checkpoint: saved });
  } catch (error) {
    console.error('[checkpoint-telegram]', error);
    return NextResponse.json({
      checkpoint: saved,
      warning: 'Checkpoint saved, but the Telegram notification could not be sent.',
    });
  }
}
