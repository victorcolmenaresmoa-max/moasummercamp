import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { callLLM } from '@/lib/ai/llm';
import { tutorSystem, tutorUserMessage } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Asistente para el participante dentro del lab. El cliente registra la consulta despues de mostrar la respuesta. */
export async function POST(req: Request) {
  const supabase = createClient();
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

  const { prompt, extra = '', day, sectionId } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
  }

  const { data: profile } = await supabase.from('profiles').select('workbook_route').eq('id', userId).single();

  try {
    const text = await callLLM({
      system: tutorSystem(profile?.workbook_route),
      user: tutorUserMessage(prompt, String(extra).slice(0, 2000), day, sectionId, profile?.workbook_route),
      maxTokens: 900,
      temperature: 0.4,
    });

    return NextResponse.json({ text });
  } catch (e: any) {
    console.error('[ai/assist]', e);
    return NextResponse.json({ error: e.message ?? 'Assistant error' }, { status: 500 });
  }
}
