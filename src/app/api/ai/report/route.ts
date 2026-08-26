import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMJson, LlmError, MODEL } from '@/lib/ai/llm';
import { REPORT_SCHEMA, normalizeReport, type ReportJson } from '@/lib/ai/schema';
import { EVALUATOR_SYSTEM, buildWorkbookTranscript, evaluatorUserMessage } from '@/lib/ai/prompts';
import { hasContent } from '@/lib/utils';
import type { ResponseRow } from '@/types/database';

export const runtime = 'nodejs';
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

/**
 * Genera el reporte pedagogico de un participante.
 * Lo puede lanzar: (a) un moderador/admin desde el panel,
 *                  (b) el propio participante al terminar el Dia 4.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'No autenticado.' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('id, role').eq('id', user.id).single();
  if (!me) return NextResponse.json({ error: 'Perfil no encontrado.' }, { status: 403 });

  const body = await req.json().catch(() => ({}) as any);
  const targetId: string = body?.userId ?? user.id;

  const isStaff = me.role === 'moderator' || me.role === 'admin';
  if (!isStaff && targetId !== user.id) {
    return NextResponse.json({ error: 'Sin permiso para evaluar a otro participante.' }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Anadela en las variables de entorno.' },
      { status: 500 },
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'Falta GEMINI_API_KEY en el servidor. Anadela en las variables de entorno.' },
      { status: 500 },
    );
  }

  // service_role: la identidad y el rol ya se validaron arriba.
  const admin = createAdminClient();

  const { data: target } = await admin
    .from('profiles')
    .select('id, full_name, campus')
    .eq('id', targetId)
    .single();
  if (!target) return NextResponse.json({ error: 'Participante no encontrado.' }, { status: 404 });

  const [{ data: responses }, { data: interactions }] = await Promise.all([
    admin.from('responses').select('day, section_id, field_key, field_label, value').eq('user_id', targetId),
    admin
      .from('ai_interactions')
      .select('day, prompt')
      .eq('user_id', targetId)
      .order('created_at', { ascending: true })
      .limit(40),
  ]);

  const rows = (responses ?? []) as ResponseRow[];
  const filled = rows.filter((r) => hasContent(r.value));
  if (filled.length < 5) {
    return NextResponse.json(
      { error: `El workbook solo tiene ${filled.length} respuesta(s) con contenido. Se necesitan al menos 5 para evaluar.` },
      { status: 400 },
    );
  }

  const transcript = buildWorkbookTranscript(rows, target.full_name, target.campus);
  const aiUsage = (interactions ?? [])
    .map((i: any) => `Dia ${i.day ?? '?'}: ${String(i.prompt).slice(0, 180)}`)
    .join('\n');

  try {
    const { data, raw } = await callLLMJson<ReportJson>({
      system: EVALUATOR_SYSTEM,
      user: evaluatorUserMessage(transcript, aiUsage),
      schema: REPORT_SCHEMA,
      maxTokens: 4000,
      temperature: 0.2,
    });

    const parsed = normalizeReport(data);

    const { data: saved, error } = await admin
      .from('ai_reports')
      .insert({
        user_id: targetId,
        requested_by: user.id,
        model: MODEL,
        summary: parsed.summary,
        strengths: parsed.strengths,
        growth_areas: parsed.growth_areas,
        evidence_use: parsed.evidence_use,
        pedagogical_depth: parsed.pedagogical_depth,
        reflection_depth: parsed.reflection_depth,
        next_step: parsed.next_step,
        moderator_notes: parsed.moderator_notes ?? null,
        raw: { text: raw.slice(0, 20000) },
      })
      .select()
      .single();

    if (error) {
      console.error('[ai/report] insert', error);
      return NextResponse.json(
        { error: `El reporte se genero pero no se pudo guardar: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: saved });
  } catch (e: any) {
    console.error('[ai/report]', e?.message, e?.detail);
    const message = e instanceof LlmError ? e.message : (e?.message ?? 'Error inesperado generando el reporte.');
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
