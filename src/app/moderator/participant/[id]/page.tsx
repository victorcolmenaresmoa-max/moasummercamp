import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
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
import type { AiReportDisplay } from '@/components/moderator/ReportPanel';
import { ModeratorRealtime } from '@/components/moderator/ModeratorRealtime';
import { ParticipantDayOverride } from '@/components/moderator/ParticipantDayOverride';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { ArrowLeftIcon } from '@/components/ui/Icons';
import { formatDuration, hasContent, labSessionSeconds, pct, timeAgo } from '@/lib/utils';
import { AI_EVIDENCE_BUCKET, parseExternalAiEvidence } from '@/lib/ai/evidence';
import type {
  AiInteractionRow,
  CheckpointRow,
  DayAccessRow,
  LabTimeSessionRow,
  ParticipantDayAccessRow,
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
    { data: timeSessions },
  ] = await Promise.all([
    supabase.from('responses').select('field_key, value, day, updated_at').eq('user_id', params.id),
    supabase.from('checkpoints').select('*').eq('user_id', params.id),
    supabase
      .from('ai_reports')
      .select('id, user_id, model, summary, strengths, growth_areas, evidence_use, pedagogical_depth, reflection_depth, next_step, moderator_notes, generated_at')
      .eq('user_id', params.id)
      .order('generated_at', { ascending: false })
      .limit(1),
    supabase
      .from('ai_interactions')
      .select('id, day, section_id, prompt, response, created_at')
      .eq('user_id', params.id)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase.from('day_access').select('*'),
    supabase.from('participant_day_access').select('*').eq('user_id', params.id),
    supabase
      .from('lab_time_sessions')
      .select('user_id, day, started_at, last_seen_at, ended_at')
      .eq('user_id', params.id),
  ]);

  const answers = new Map((responses ?? []).map((r) => [r.field_key, r.value]));
  const cps = new Map((checkpoints ?? []).map((c: CheckpointRow) => [`${c.day}-${c.checkpoint_number}`, c]));
  const report = ((reports ?? [])[0] ?? null) as AiReportDisplay | null;

  const interactionRows = (interactions ?? []) as Pick<
    AiInteractionRow,
    'id' | 'day' | 'section_id' | 'prompt' | 'response' | 'created_at'
  >[];
  const parsedInteractions = interactionRows.map((row) => ({ ...row, evidence: parseExternalAiEvidence(row.response) }));

  const imageUrlByPath = new Map<string, string>();
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    const paths = Array.from(
      new Set(parsedInteractions.map((row) => row.evidence?.imagePath).filter((path): path is string => Boolean(path))),
    );
    if (paths.length) {
      const admin = createAdminClient();
      await Promise.all(
        paths.map(async (path) => {
          const { data } = await admin.storage.from(AI_EVIDENCE_BUCKET).createSignedUrl(path, 60 * 60);
          if (data?.signedUrl) imageUrlByPath.set(path, data.signedUrl);
        }),
      );
    }
  }
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

  // Una sola pasada: evita volver a recorrer todas las respuestas por cada dia
  // y evita ordenar solo para encontrar la actividad mas reciente.
  const answeredByDay: Record<number, number> = {};
  let lastActivity: string | undefined;
  for (const response of responses ?? []) {
    if (hasContent(response.value)) answeredByDay[response.day] = (answeredByDay[response.day] ?? 0) + 1;
    if (!lastActivity || response.updated_at > lastActivity) lastActivity = response.updated_at;
  }
  const answeredInDay = (d: number) => answeredByDay[d] ?? 0;
  const pendingReview = (checkpoints ?? []).reduce(
    (count, c) => count + (c.status === 'pending' && c.submitted_at ? 1 : 0),
    0,
  );


  const timeByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const session of (timeSessions ?? []) as Pick<
    LabTimeSessionRow,
    'day' | 'started_at' | 'last_seen_at' | 'ended_at'
  >[]) {
    timeByDay[session.day] = (timeByDay[session.day] ?? 0) + labSessionSeconds(session);
  }
  const totalLabTime = Object.values(timeByDay).reduce((sum, seconds) => sum + seconds, 0);

  return (
    <div className="space-y-6">
      <ModeratorRealtime userId={params.id} />

      <Link
        href="/moderator"
        prefetch={false}
        className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 transition hover:text-teal-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Back to dashboard
      </Link>

      <header className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="h-display text-2xl text-teal-900">{participant.full_name}</h1>
              <Badge tone="accent">{WORKBOOK_ROUTE_LABELS[route]}</Badge>
              {pendingReview > 0 && <Badge tone="warn">{pendingReview} to review</Badge>}
              <Badge tone="neutral">Lab time {formatDuration(totalLabTime)}</Badge>
            </div>
            <p className="mt-1 text-sm font-semibold text-ink/55">
              {participant.campus ? CAMPUS_LABELS[participant.campus] : 'No campus'} · {participant.email} ·
              last activity {timeAgo(lastActivity)}
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
                  <p className="mt-0.5 text-[10px] font-bold text-ink/45" title="Accumulated Lab time">
                    {formatDuration(timeByDay[d.day] ?? 0)}
                  </p>
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

      <nav className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1" aria-label="Days">
        {workbook.map((d) => (
          <Link
            key={d.day}
            href={`/moderator/participant/${params.id}?day=${d.day}`}
            prefetch={false}
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="h-display text-lg text-teal-900">AI use evidence</h2>
            <p className="mt-1 text-xs font-semibold text-ink/45">Recorded prompts and response evidence.</p>
          </div>
          {parsedInteractions.length > 0 && (
            <Badge tone="accent">{parsedInteractions.length} records</Badge>
          )}
        </div>

        {!parsedInteractions.length ? (
          <p className="mt-3 text-sm font-semibold text-ink/50">The participant has not saved AI evidence yet.</p>
        ) : (
          <div className="mt-4 space-y-3">
            {parsedInteractions.map((i) => {
              const imageUrl = i.evidence?.imagePath ? imageUrlByPath.get(i.evidence.imagePath) : null;
              return (
                <article key={i.id} className="rounded-2xl border border-teal-100 bg-teal-50/45 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="eyebrow text-teal-600">
                      Day {i.day ?? '?'} · {timeAgo(i.created_at)}
                    </p>
                    <span className="chip bg-white text-plum-500">{i.evidence?.provider ?? 'Legacy AI record'}</span>
                  </div>

                  <div className="mt-3">
                    <p className="eyebrow text-ink/40">Prompt used</p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-ink/80">{i.prompt}</p>
                  </div>

                  {i.evidence?.text && (
                    <div className="mt-3 rounded-2xl bg-white p-3.5">
                      <p className="eyebrow text-plum-400">AI response</p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">
                        {i.evidence.text}
                      </p>
                    </div>
                  )}

                  {!i.evidence && i.response && (
                    <div className="mt-3 rounded-2xl bg-white p-3.5">
                      <p className="eyebrow text-plum-400">Previous in-app response</p>
                      <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-ink/75">
                        {i.response}
                      </p>
                    </div>
                  )}

                  {imageUrl && (
                    <a href={imageUrl} target="_blank" rel="noreferrer" className="mt-3 block">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={imageUrl}
                        alt="AI response screenshot evidence"
                        className="max-h-[520px] w-full rounded-2xl border border-teal-100 bg-white object-contain"
                      />
                    </a>
                  )}

                  {i.evidence?.imagePath && !imageUrl && (
                    <p className="mt-3 rounded-xl bg-sun-100 px-3 py-2 text-xs font-bold text-sun-700">
                      A screenshot was saved, but a preview link could not be generated.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
