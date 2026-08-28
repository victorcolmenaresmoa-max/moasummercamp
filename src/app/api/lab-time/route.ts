import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const STALE_GRACE_MS = 30_000;

function closeAt(lastSeenAt: string | null, now: Date) {
  if (!lastSeenAt) return now.toISOString();
  const lastSeen = new Date(lastSeenAt).getTime();
  const maxEnd = lastSeen + STALE_GRACE_MS;
  return new Date(Math.min(now.getTime(), maxEnd)).toISOString();
}

export async function POST(request: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { action?: string; day?: number; sessionId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('role').eq('id', userId).single();
  if (!profile || profile.role !== 'participant') {
    return NextResponse.json({ error: 'Participant session required' }, { status: 403 });
  }

  const now = new Date();
  const admin = createAdminClient();

  if (body.action === 'start') {
    const day = Number(body.day);
    if (!Number.isInteger(day) || day < 1 || day > 4) {
      return NextResponse.json({ error: 'Invalid Lab day' }, { status: 400 });
    }

    // Close any orphaned/open visit first. This prevents multiple tabs from
    // counting the same teacher twice and caps stale sessions at one heartbeat.
    const { data: openSessions } = await admin
      .from('lab_time_sessions')
      .select('id, last_seen_at')
      .eq('user_id', userId)
      .is('ended_at', null);

    for (const session of openSessions ?? []) {
      await admin
        .from('lab_time_sessions')
        .update({ ended_at: closeAt(session.last_seen_at, now) })
        .eq('id', session.id)
        .eq('user_id', userId)
        .is('ended_at', null);
    }

    const { data, error } = await admin
      .from('lab_time_sessions')
      .insert({
        user_id: userId,
        day,
        started_at: now.toISOString(),
        last_seen_at: now.toISOString(),
      })
      .select('id')
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Could not start Lab timer' }, { status: 500 });
    }

    return NextResponse.json({ sessionId: data.id });
  }

  if (body.action === 'heartbeat') {
    if (!body.sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    const { error } = await admin
      .from('lab_time_sessions')
      .update({ last_seen_at: now.toISOString() })
      .eq('id', body.sessionId)
      .eq('user_id', userId)
      .is('ended_at', null);
    if (error) return NextResponse.json({ error: 'Could not update Lab timer' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === 'pause') {
    if (!body.sessionId) return NextResponse.json({ error: 'Missing session' }, { status: 400 });
    const { error } = await admin
      .from('lab_time_sessions')
      .update({ last_seen_at: now.toISOString(), ended_at: now.toISOString() })
      .eq('id', body.sessionId)
      .eq('user_id', userId)
      .is('ended_at', null);
    if (error) return NextResponse.json({ error: 'Could not pause Lab timer' }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Unknown timer action' }, { status: 400 });
}
