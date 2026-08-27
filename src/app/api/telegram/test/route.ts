import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { escapeTelegramHtml, sendTelegramMessage } from '@/lib/telegram';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('full_name, role').eq('id', userId).single();
  if (!profile || (profile.role !== 'moderator' && profile.role !== 'admin')) {
    return NextResponse.json({ error: 'Staff access is required.' }, { status: 403 });
  }

  try {
    const result = await sendTelegramMessage({
      text: `✅ <b>MOA Reading Lab Telegram test</b>\n\nSent by ${escapeTelegramHtml(profile.full_name)}. Checkpoint alerts are connected correctly.`,
      buttonText: 'Open moderator panel',
      buttonUrl: `${new URL(req.url).origin}/moderator`,
    });

    if (!result.configured) {
      return NextResponse.json({ error: 'TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_IDS is not configured.' }, { status: 400 });
    }
    if (result.failed) {
      return NextResponse.json({ error: `Sent to ${result.sent} chat(s), but ${result.failed} failed: ${result.errors.join(' | ')}` }, { status: 502 });
    }

    return NextResponse.json({ ok: true, message: `Test alert sent to ${result.sent} Telegram chat(s).` });
  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? 'The Telegram test could not be sent.' }, { status: 502 });
  }
}
