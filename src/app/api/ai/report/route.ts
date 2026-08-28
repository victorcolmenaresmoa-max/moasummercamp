import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getVerifiedUserId } from '@/lib/supabase/auth';
import { createAdminClient } from '@/lib/supabase/admin';
import { callLLMJson, LlmError, MODEL } from '@/lib/ai/llm';
import { REPORT_SCHEMA, normalizeReport, type ReportJson } from '@/lib/ai/schema';
import { evaluatorSystem, buildWorkbookTranscript, evaluatorUserMessage } from '@/lib/ai/prompts';
import { hasContent } from '@/lib/utils';
import { parseExternalAiEvidence } from '@/lib/ai/evidence';
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
  const userId = await getVerifiedUserId(supabase);
  if (!userId) return NextResponse.json({ error: 'Not authenticated.' }, { status: 401 });

  const { data: me } = await supabase.from('profiles').select('id, role').eq('id', userId).single();
  if (!me) return NextResponse.json({ error: 'Profile not found.' }, { status: 403 });

  const body = await req.json().catch(() => ({}) as any);
  const targetId: string = body?.userId ?? userId;

  const isStaff = me.role === 'moderator' || me.role === 'admin';
  if (!isStaff && targetId !== userId) {
    return NextResponse.json({ error: 'You do not have permission to evaluate another participant.' }, { status: 403 });
  }

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY is missing on the server. Add it to the environment variables.' },
      { status: 500 },
    );
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY is missing on the server. Add it to the environment variables.' },
      { status: 500 },
    );
  }

  // service_role: la identidad y el rol ya se validaron arriba.
  const admin = createAdminClient();

  const { data: target } = await admin
    .from('profiles')
    .select('id, full_name, campus, workbook_route')
    .eq('id', targetId)
    .single();
  if (!target) return NextResponse.json({ error: 'Participant not found.' }, { status: 404 });

  const [{ data: responses }, { data: interactions }] = await Promise.all([
    admin.from('responses').select('day, section_id, field_key, field_label, value').eq('user_id', targetId),
    admin
      .from('ai_interactions')
      .select('day, prompt, response')
      .eq('user_id', targetId)
      .order('created_at', { ascending: true })
      .limit(100),
  ]);

  const rows = (responses ?? []) as ResponseRow[];
  const filled = rows.filter((r) => hasContent(r.value));
  if (filled.length < 5) {
    return NextResponse.json(
      { error: `The workbook has only ${filled.length} response(s) with content. At least 5 are required for evaluation.` },
      { status: 400 },
    );
  }

  const transcript = buildWorkbookTranscript(rows, target.full_name, target.campus, target.workbook_route);
  const aiUsage = (interactions ?? [])
    .map((i: any) => {
      const evidence = parseExternalAiEvidence(i.response);
      const responseEvidence = evidence
        ? [
            evidence.text ? `response text: ${evidence.text.slice(0, 220)}` : '',
            evidence.imagePath ? 'screenshot evidence attached' : '',
          ]
            .filter(Boolean)
            .join(' | ')
        : i.response
          ? `legacy in-app response: ${String(i.response).slice(0, 220)}`
          : 'no response evidence';
      return `Day ${i.day ?? '?'} | prompt: ${String(i.prompt).slice(0, 220)} | ${responseEvidence}`;
    })
    .join('\n');

  try {
    const { data, raw } = await callLLMJson<ReportJson>({
      system: evaluatorSystem(target.workbook_route),
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
        requested_by: userId,
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
        { error: `The report was generated but could not be saved: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ report: saved });
  } catch (e: any) {
    console.error('[ai/report]', e?.message, e?.detail);
    const message = e instanceof LlmError ? e.message : (e?.message ?? 'Unexpected error while generating the report.');
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
