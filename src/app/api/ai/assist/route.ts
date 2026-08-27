import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { callLLM } from '@/lib/ai/llm';
import { tutorSystem, tutorUserMessage } from '@/lib/ai/prompts';

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

  const { data: profile } = await supabase.from('profiles').select('workbook_route').eq('id', user.id).single();

  try {
    const text = await callLLM({
      system: tutorSystem(profile?.workbook_route),
      user: tutorUserMessage(prompt, String(extra).slice(0, 2000), day, sectionId, profile?.workbook_route),
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
