import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { CAMPUS_LABELS, getDay, normalizeWorkbookRoute, WORKBOOK_ROUTE_LABELS } from '@/lib/workbook';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;',
  })[char] ?? char);
}

export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const dayNumber = Number(body?.day);
  const checkpointNumber = Number(body?.checkpointNumber);
  if (!Number.isInteger(dayNumber) || !Number.isInteger(checkpointNumber)) {
    return NextResponse.json({ error: 'Checkpoint inválido.' }, { status: 400 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor.' }, { status: 500 });
  }

  const admin = createAdminClient();
  const { data: profile } = await admin
    .from('profiles')
    .select('id, full_name, email, campus, role, workbook_route')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'participant') {
    return NextResponse.json({ error: 'Solo los participantes pueden enviar checkpoints.' }, { status: 403 });
  }

  const route = normalizeWorkbookRoute(profile.workbook_route);
  const day = getDay(dayNumber, route);
  const section = day?.sections.find((s) => s.checkpoint?.number === checkpointNumber);
  if (!day || !section?.checkpoint) {
    return NextResponse.json({ error: 'Ese checkpoint no pertenece a tu workbook.' }, { status: 400 });
  }

  const { data: existing } = await admin
    .from('checkpoints')
    .select('*')
    .eq('user_id', user.id)
    .eq('day', dayNumber)
    .eq('checkpoint_number', checkpointNumber)
    .maybeSingle();

  if (existing?.status === 'approved') {
    return NextResponse.json({ error: 'Este checkpoint ya fue aprobado.' }, { status: 409 });
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
    return NextResponse.json({ error: saveError?.message ?? 'No se pudo registrar el checkpoint.' }, { status: 500 });
  }

  const recipients = (process.env.CHECKPOINT_NOTIFICATION_EMAILS ?? '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;

  if (!recipients.length || !apiKey || !from) {
    return NextResponse.json({
      checkpoint: saved,
      warning: 'Checkpoint guardado. Falta configurar el correo de notificaciones en Vercel.',
    });
  }

  const link = `${new URL(req.url).origin}/moderator/participant/${user.id}?day=${dayNumber}#checkpoint-${checkpointNumber}`;
  const routeLabel = WORKBOOK_ROUTE_LABELS[route];
  const campus = profile.campus ? CAMPUS_LABELS[profile.campus] : 'Sin sede';
  const subject = `Checkpoint listo · ${profile.full_name} · ${routeLabel} · Día ${dayNumber}`;
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:620px;margin:auto;color:#12343b">
      <div style="background:#036870;color:white;padding:24px;border-radius:18px 18px 0 0">
        <strong style="font-size:20px">MOA Education · Reading Lab</strong>
      </div>
      <div style="padding:24px;border:1px solid #d7ecee;border-top:0;border-radius:0 0 18px 18px">
        <p><strong>${escapeHtml(profile.full_name)}</strong> llegó al <strong>Checkpoint ${checkpointNumber}</strong>.</p>
        <p>Ruta: <strong>${routeLabel}</strong><br/>Sede: <strong>${escapeHtml(campus)}</strong><br/>Día ${dayNumber}: <strong>${escapeHtml(day.title)}</strong></p>
        <p style="margin:28px 0">
          <a href="${link}" style="background:#036870;color:#fff;text-decoration:none;padding:12px 18px;border-radius:999px;font-weight:bold">Abrir checkpoint para corregir</a>
        </p>
        <p style="font-size:12px;color:#60757a">El enlace abre directamente el participante, el día y el checkpoint correspondiente.</p>
      </div>
    </div>`;

  try {
    const emailResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'Idempotency-Key': `checkpoint-${user.id}-${dayNumber}-${checkpointNumber}-${nextCount}`,
      },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });

    if (!emailResponse.ok) {
      const detail = await emailResponse.text();
      console.error('[checkpoint-email]', emailResponse.status, detail);
      return NextResponse.json({ checkpoint: saved, warning: 'Checkpoint guardado, pero el correo no pudo enviarse.' });
    }

    await admin
      .from('checkpoints')
      .update({ notification_sent_at: new Date().toISOString() })
      .eq('id', saved.id);

    return NextResponse.json({ checkpoint: saved });
  } catch (error) {
    console.error('[checkpoint-email]', error);
    return NextResponse.json({ checkpoint: saved, warning: 'Checkpoint guardado, pero el correo no pudo enviarse.' });
  }
}
