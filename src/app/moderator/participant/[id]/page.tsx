import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/supabase/session';
import { WORKBOOK, CAMPUS_LABELS, totalFields } from '@/lib/workbook';
import { AnswerValue } from '@/components/moderator/AnswerValue';
import { CheckpointApproval } from '@/components/moderator/CheckpointApproval';
import { ReportPanel } from '@/components/moderator/ReportPanel';
import { RealtimeRefresh } from '@/components/moderator/RealtimeRefresh';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { hasContent, pct, timeAgo } from '@/lib/utils';
import type { AiInteractionRow, AiReportRow, CheckpointRow, ResponseRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function ParticipantDetail({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { day?: string };
}) {
  const staff = await requireStaff();
  const supabase = createClient();

  const { data: participant } = await supabase.from('profiles').select('*').eq('id', params.id).single();
  if (!participant) notFound();

  const [{ data: responses }, { data: checkpoints }, { data: reports }, { data: interactions }] = await Promise.all([
    supabase.from('responses').select('*').eq('user_id', params.id),
    supabase.from('checkpoints').select('*').eq('user_id', params.id),
    supabase.from('ai_reports').select('*').eq('user_id', params.id).order('generated_at', { ascending: false }).limit(1),
    supabase.from('ai_interactions').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10),
  ]);

  const answers = new Map((responses ?? []).map((r: ResponseRow) => [r.field_key, r.value]));
  const cps = new Map((checkpoints ?? []).map((c: CheckpointRow) => [`${c.day}-${c.checkpoint_number}`, c]));
  const report = ((reports ?? [])[0] ?? null) as AiReportRow | null;
  const activeDay = Number(searchParams.day ?? 1) || 1;
  const day = WORKBOOK.find((d) => d.day === activeDay)!;

  const answeredInDay = (d: number) =>
    (responses ?? []).filter((r) => r.day === d && hasContent(r.value)).length;

  const lastActivity = (responses ?? [])
    .map((r) => r.updated_at)
    .sort()
    .at(-1);

  return (
    <div className="space-y-6">
      <RealtimeRefresh userId={params.id} />

      <Link href="/moderator" className="text-sm font-semibold text-brand-600">← Volver al panel</Link>

      {/* Cabecera del participante */}
      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-2xl font-bold text-brand-900">{participant.full_name}</h1>
            <p className="text-sm text-ink/60">
              {participant.campus ? CAMPUS_LABELS[participant.campus] : 'Sin sede'} · {participant.email} ·
              última actividad {timeAgo(lastActivity)}
            </p>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {WORKBOOK.map((d) => (
              <div key={d.day} className="w-20 text-center">
                <p className="text-[10px] font-bold uppercase text-ink/50">D{d.day}</p>
                <ProgressBar className="mt-1" value={pct(answeredInDay(d.day), totalFields(d.day))} />
                <p className="mt-1 text-xs font-bold text-brand-600">{pct(answeredInDay(d.day), totalFields(d.day))}%</p>
              </div>
            ))}
          </div>
        </div>
      </header>

      <ReportPanel participantId={participant.id} participantName={participant.full_name} report={report} />

      {/* Tabs de dias */}
      <nav className="flex flex-wrap gap-2">
        {WORKBOOK.map((d) => (
          <Link
            key={d.day}
            href={`/moderator/participant/${params.id}?day=${d.day}`}
            className={d.day === activeDay ? 'btn-primary' : 'btn-ghost'}
          >
            Day {d.day} · {d.theme}
          </Link>
        ))}
      </nav>

      {/* Respuestas del dia */}
      {day.sections.map((section) => (
        <section key={section.id} className="card p-6">
          <h2 className="font-serif text-lg font-bold text-brand-900">{section.title}</h2>

          <div className="mt-4 space-y-5">
            {section.fields
              .filter((f) => f.type !== 'info' && f.type !== 'ai_prompt')
              .map((f) => (
                <div key={f.key} className="border-l-2 border-brand-100 pl-4">
                  <p className="text-xs font-bold uppercase tracking-wide text-brand-700">
                    {'label' in f ? f.label : f.key}
                  </p>
                  <div className="mt-2">
                    <AnswerValue value={answers.get(f.key)} />
                  </div>
                </div>
              ))}
          </div>

          {section.checkpoint && (
            <div className="mt-6">
              <CheckpointApproval
                participantId={participant.id}
                moderatorId={staff.id}
                day={day.day}
                checkpoint={section.checkpoint}
                row={cps.get(`${day.day}-${section.checkpoint.number}`)}
              />
            </div>
          )}
        </section>
      ))}

      {/* Uso de IA */}
      <section className="card p-6">
        <h2 className="font-serif text-lg font-bold text-brand-900">Uso del asistente de IA (últimas 10)</h2>
        {!interactions?.length ? (
          <p className="mt-2 text-sm text-ink/55">No usó el asistente integrado.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {(interactions as AiInteractionRow[]).map((i) => (
              <li key={i.id} className="rounded-xl bg-brand-50/70 p-3">
                <p className="text-[11px] font-bold uppercase text-brand-600">
                  Day {i.day ?? '?'} · {timeAgo(i.created_at)}
                </p>
                <p className="mt-1 text-sm text-ink/80">{i.prompt.slice(0, 300)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
