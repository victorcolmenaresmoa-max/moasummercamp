import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/anthropic';
import { TUTOR_SYSTEM, tutorUserMessage } from '@/lib/ai/prompts';

export const runtime = 'nodejs';
export const maxDuration = 30;

/** Asistente para el participante dentro del lab. Registra cada consulta. */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { prompt, extra = '', day, sectionId } = await req.json();
  if (!prompt || typeof prompt !== 'string') {
    return NextResponse.json({ error: 'Prompt requerido' }, { status: 400 });
  }

  try {
    const text = await callLLM({
      system: TUTOR_SYSTEM,
      user: tutorUserMessage(prompt, String(extra).slice(0, 2000), day, sectionId),
      maxTokens: 900,
      temperature: 0.4,
    });

    await supabase.from('ai_interactions').insert({
      user_id: user.id,
      day: day ?? null,
      section_id: sectionId ?? null,
      prompt: extra ? `${prompt}\n[contexto] ${extra}` : prompt,
      response: text,
    });

    return NextResponse.json({ text });
  } catch (e: any) {
    console.error('[ai/assist]', e);
    return NextResponse.json({ error: e.message ?? 'Error del asistente' }, { status: 500 });
  }
}
