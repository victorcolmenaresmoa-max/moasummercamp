import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/supabase/session';
import {
  getWorkbook,
  CAMPUS_LABELS,
  totalFields,
  normalizeWorkbookRoute,
  WORKBOOK_ROUTE_LABELS,
} from '@/lib/workbook';
import { AnswerValue } from '@/components/moderator/AnswerValue';
import { CheckpointApproval } from '@/components/moderator/CheckpointApproval';
import { ReportPanel } from '@/components/moderator/ReportPanel';
import { ModeratorRealtime } from '@/components/moderator/ModeratorRealtime';
import { ParticipantDayOverride } from '@/components/moderator/ParticipantDayOverride';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeftIcon } from '@/components/ui/Icons';
import { hasContent, pct, timeAgo } from '@/lib/utils';
import type {
  AiInteractionRow,
  AiReportRow,
  CheckpointRow,
  DayAccessRow,
  ParticipantDayAccessRow,
  ResponseRow,
} from '@/types/database';

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

  const { data: participant } = await supabase
    .from('profiles')
    .select('id, full_name, email, campus, role, workbook_route')
    .eq('id', params.id)
    .single();
  if (!participant) notFound();

  const route = normalizeWorkbookRoute(participant.workbook_route);
  const workbook = getWorkbook(route);

  const [
    { data: responses },
    { data: checkpoints },
    { data: reports },
    { data: interactions },
    { data: access },
    { data: overrides },
  ] = await Promise.all([
    supabase.from('responses').select('*').eq('user_id', params.id),
    supabase.from('checkpoints').select('*').eq('user_id', params.id),
    supabase.from('ai_reports').select('*').eq('user_id', params.id).order('generated_at', { ascending: false }).limit(1),
    supabase.from('ai_interactions').select('*').eq('user_id', params.id).order('created_at', { ascending: false }).limit(10),
    supabase.from('day_access').select('*'),
    supabase.from('participant_day_access').select('*').eq('user_id', params.id),
  ]);

  const answers = new Map((responses ?? []).map((r: ResponseRow) => [r.field_key, r.value]));
  const cps = new Map((checkpoints ?? []).map((c: CheckpointRow) => [`${c.day}-${c.checkpoint_number}`, c]));
  const report = ((reports ?? [])[0] ?? null) as AiReportRow | null;
  const activeDay = Number(searchParams.day ?? 1) || 1;
  const day = workbook.find((d) => d.day === activeDay) ?? workbook[0];

  const accessRows = (access ?? []) as DayAccessRow[];
  const effectiveOpen: Record<number, boolean> = Object.fromEntries(
    workbook.map((d) => {
      const own = accessRows.find((a) => a.campus && a.campus === participant.campus && a.day === d.day);
      const glob = accessRows.find((a) => a.campus === null && a.day === d.day);
      return [d.day, own?.is_open ?? glob?.is_open ?? false];
    }),
  );

  const answeredInDay = (d: number) => (responses ?? []).filter((r) => r.day === d && hasContent(r.value)).length;
  const lastActivity = (responses ?? []).map((r) => r.updated_at).sort().at(-1);
  const pendingReview = (checkpoints ?? []).filter((c) => c.status === 'pending' && c.submitted_at).length;

  return (
    <div className="space-y-6">
      <ModeratorRealtime userId={params.id} />

      <Link
        href="/moderator"
        prefetch
        className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 transition hover:text-teal-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Volver al panel
      </Link>

      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="h-display text-2xl text-teal-900">{participant.full_name}</h1>
              <Badge tone="accent">{WORKBOOK_ROUTE_LABELS[route]}</Badge>
              {pendingReview > 0 && <Badge tone="warn">{pendingReview} por revisar</Badge>}
            </div>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {participant.campus ? CAMPUS_LABELS[participant.campus] : 'Sin sede'} · {participant.email} ·
              última actividad {timeAgo(lastActivity)}
            </p>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {workbook.map((d) => {
              const p = pct(answeredInDay(d.day), totalFields(d.day, route));
              return (
                <div key={d.day} className="w-16 text-center sm:w-20">
                  <p className="eyebrow text-ink/45">D{d.day}</p>
                  <ProgressBar className="mt-1.5" value={p} />
                  <p className="mt-1 text-xs font-extrabold text-teal-600">{p}%</p>
                </div>
              );
            })}
          </div>
        </div>
      </header>

      <ParticipantDayOverride
        participantId={participant.id}
        moderatorId={staff.id}
        overrides={(overrides ?? []) as ParticipantDayAccessRow[]}
        effectiveOpen={effectiveOpen}
      />

      <ReportPanel participantId={participant.id} participantName={participant.full_name} report={report} />

      <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Días">
        {workbook.map((d) => (
          <Link
            key={d.day}
            href={`/moderator/participant/${params.id}?day=${d.day}`}
            scroll={false}
            className={`${d.day === activeDay ? 'btn-primary' : 'btn-ghost'} btn-sm shrink-0`}
          >
            Day {d.day} · {d.theme}
          </Link>
        ))}
      </nav>

      {day.sections.map((section) => (
        <section key={section.id} className="card p-6">
          <h2 className="h-display text-lg text-teal-900">{section.title}</h2>

          <div className="mt-5 space-y-5">
            {section.fields
              .filter((f) => f.type !== 'info' && f.type !== 'ai_prompt')
              .map((f) => (
                <div key={f.key} className="rounded-r-2xl border-l-4 border-teal-100 bg-teal-50/30 py-2 pl-4 pr-3">
                  <p className="eyebrow text-teal-700">{'label' in f ? f.label : f.key}</p>
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

      <section className="card p-6">
        <h2 className="h-display text-lg text-teal-900">Uso del asistente de IA (últimas 10)</h2>
        {!interactions?.length ? (
          <p className="mt-2 text-sm font-semibold text-ink/50">No usó el asistente integrado.</p>
        ) : (
          <ul className="mt-4 space-y-2.5">
            {(interactions as AiInteractionRow[]).map((i) => (
              <li key={i.id} className="rounded-2xl bg-teal-50/70 p-3.5">
                <p className="eyebrow text-teal-600">
                  Day {i.day ?? '?'} · {timeAgo(i.created_at)}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink/80">{i.prompt.slice(0, 300)}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
