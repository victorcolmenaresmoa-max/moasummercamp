import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLM, parseJson, MODEL } from '@/lib/ai/anthropic';
import { EVALUATOR_SYSTEM, buildWorkbookTranscript, evaluatorUserMessage } from '@/lib/ai/prompts';
import type { ResponseRow } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;

type ReportJson = {
  summary: string;
  strengths: { title: string; evidence: string }[];
  growth_areas: { title: string; evidence: string; suggestion: string }[];
  evidence_use: number;
  pedagogical_depth: number;
  reflection_depth: number;
  next_step: string;
  moderator_notes?: string;
};

/**
 * Genera el reporte pedagogico de un participante.
 * Lo puede lanzar: (a) un moderador/admin desde el dashboard,
 *                  (b) el propio participante al terminar el Dia 4.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
  if (!me) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 });

  const body = await req.json().catch(() => ({}));
  const targetId: string = body.userId ?? user.id;

  const isStaff = me.role === 'moderator' || me.role === 'admin';
  if (!isStaff && targetId !== user.id) {
    return NextResponse.json({ error: 'Sin permiso' }, { status: 403 });
  }

  // service_role: ya validamos identidad y rol arriba.
  const admin = createAdminClient();

  const { data: target } = await admin.from('profiles').select('*').eq('id', targetId).single();
  if (!target) return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });

  const [{ data: responses }, { data: interactions }] = await Promise.all([
    admin.from('responses').select('*').eq('user_id', targetId),
    admin.from('ai_interactions').select('day, prompt').eq('user_id', targetId).order('created_at', { ascending: true }).limit(40),
  ]);

  const rows = (responses ?? []) as ResponseRow[];
  if (rows.length < 5) {
    return NextResponse.json({ error: 'El workbook tiene muy pocas respuestas para evaluar.' }, { status: 400 });
  }

  const transcript = buildWorkbookTranscript(rows, target.full_name, target.campus);
  const aiUsage = (interactions ?? [])
    .map((i) => `Día ${i.day ?? '?'}: ${String(i.prompt).slice(0, 180)}`)
    .join('\n');

  try {
    const raw = await callLLM({
      system: EVALUATOR_SYSTEM,
      user: evaluatorUserMessage(transcript, aiUsage),
      maxTokens: 2500,
      temperature: 0.2,
    });

    const parsed = parseJson<ReportJson>(raw);

    const clamp = (n: any) => Math.min(5, Math.max(1, Math.round(Number(n) || 1)));

    const { data: saved, error } = await admin
      .from('ai_reports')
      .insert({
        user_id: targetId,
        requested_by: user.id,
        model: MODEL,
        summary: parsed.summary,
        strengths: parsed.strengths ?? [],
        growth_areas: parsed.growth_areas ?? [],
        evidence_use: clamp(parsed.evidence_use),
        pedagogical_depth: clamp(parsed.pedagogical_depth),
        reflection_depth: clamp(parsed.reflection_depth),
        next_step: parsed.next_step,
        moderator_notes: parsed.moderator_notes ?? null,
        raw: { text: raw },
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ report: saved });
  } catch (e: any) {
    console.error('[ai/report]', e);
    return NextResponse.json({ error: e.message ?? 'Error generando el reporte' }, { status: 500 });
  }
}
