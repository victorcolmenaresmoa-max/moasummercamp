import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/supabase/session';
import { getOpenDays, isStaff } from '@/lib/access';
import { getDay, totalFields, normalizeWorkbookRoute } from '@/lib/workbook';
import { ReadingText } from '@/components/ReadingText';
import { WorkbookField } from '@/components/WorkbookField';
import { CheckpointBox } from '@/components/CheckpointBox';
import { DayLocked } from '@/components/DayLocked';
import { DayFinish } from '@/components/DayFinish';
import { LabRealtime } from '@/components/LabRealtime';
import { ArrowLeftIcon } from '@/components/ui/Icons';
import { MoaPattern } from '@/components/brand/Moa';
import { hasContent, pct } from '@/lib/utils';
import type { CheckpointRow, ResponseRow } from '@/types/database';

export const dynamic = 'force-dynamic';

const HEADER_TONE: Record<number, string> = {
  1: 'from-teal-500 to-teal-700',
  2: 'from-teal-600 to-plum-500',
  3: 'from-plum-500 to-teal-700',
  4: 'from-teal-500 to-teal-800',
};

export async function generateMetadata({ params }: { params: { day: string } }) {
  return { title: `Day ${params.day} · Reading Lab` };
}

export default async function DayPage({ params }: { params: { day: string } }) {
  const dayNumber = Number(params.day);
  const profile = await requireProfile();
  const route = normalizeWorkbookRoute(profile.workbook_route);
  const day = getDay(dayNumber, route);
  if (!day) notFound();

  const supabase = createClient();
  const [{ data: responses }, { data: checkpoints }, openDays] = await Promise.all([
    supabase.from('responses').select('*').eq('user_id', profile.id).eq('day', dayNumber),
    supabase.from('checkpoints').select('*').eq('user_id', profile.id).eq('day', dayNumber),
    getOpenDays(),
  ]);

  const staff = isStaff(profile);
  const unlocked = staff || openDays.has(dayNumber);

  if (!unlocked) {
    return (
      <>
        <LabRealtime userId={profile.id} />
        <DayLocked day={day} />
      </>
    );
  }

  const answers = new Map((responses ?? []).map((r: ResponseRow) => [r.field_key, r.value]));
  const cps = new Map((checkpoints ?? []).map((c: CheckpointRow) => [c.checkpoint_number, c]));
  const done = (responses ?? []).filter((r) => hasContent(r.value)).length;
  const total = totalFields(dayNumber, route);
  const progress = pct(done, total);

  const renderReadingBeforeSections = !day.readingAfterSectionId;

  return (
    <div className="space-y-8">
      <LabRealtime userId={profile.id} />

      <Link
        href="/lab"
        prefetch
        className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 transition hover:text-teal-800 no-print"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        Mi panel
      </Link>

      <header className="card relative isolate overflow-hidden">
        <div className={`relative bg-gradient-to-br px-6 py-7 text-white sm:px-8 ${HEADER_TONE[day.day]}`}>
          <MoaPattern variant="soft" />
          <div className="relative">
            <p className="eyebrow text-sun-400">
              Day {day.day} · {day.theme}
            </p>
            <h1 className="h-display mt-2 text-3xl leading-tight sm:text-4xl">{day.title}</h1>
            <p className="mt-3 max-w-2xl text-sm font-semibold text-white/85">
              Guiding question: {day.guidingQuestion}
            </p>
            <p className="mt-1 text-xs font-semibold text-white/55">Reading Lab: {day.schedule}</p>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <p className="eyebrow text-teal-600">By the end of this lab I will be able to…</p>
          <ul className="mt-3 grid gap-1.5 text-sm text-ink/75 sm:grid-cols-2">
            {day.objectives.map((o) => (
              <li key={o} className="flex gap-2">
                <span className="mt-0.5 shrink-0 font-bold text-coral-500" aria-hidden="true">
                  ▸
                </span>
                {o}
              </li>
            ))}
          </ul>
        </div>
      </header>

      {renderReadingBeforeSections && <ReadingText title={day.reading.title} blocks={day.reading.blocks} />}

      {day.sections.map((section) => (
        <div key={section.id} className="space-y-8">
          <section className="card p-6 sm:p-7" id={section.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-2 border-b-2 border-teal-50 pb-3">
              <h2 className="h-display text-xl text-teal-900">{section.title}</h2>
              {section.minutes && <span className="chip bg-teal-50 text-teal-600">{section.minutes} min</span>}
            </div>

            {section.intro && <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-ink/65">{section.intro}</p>}

            <div className="mt-6 space-y-7">
              {section.fields.map((field) => (
                <WorkbookField
                  key={field.key}
                  field={field}
                  userId={profile.id}
                  day={day.day}
                  sectionId={section.id}
                  initial={answers.get(field.key) ?? {}}
                />
              ))}
            </div>

            {section.checkpoint && (
              <div className="mt-7">
                <CheckpointBox
                  checkpoint={section.checkpoint}
                  row={cps.get(section.checkpoint.number)}
                  day={day.day}
                  sectionId={section.id}
                />
              </div>
            )}
          </section>

          {day.readingAfterSectionId === section.id && (
            <ReadingText title={day.reading.title} blocks={day.reading.blocks} />
          )}
        </div>
      ))}

      <section className="card p-6 sm:p-7">
        <h2 className="h-display text-xl text-teal-900">MY EVIDENCE FOR TODAY</h2>
        <ul className="mt-4 space-y-2 text-sm text-ink/75">
          {day.finalChecklist.map((c) => (
            <li key={c} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 text-teal-200" aria-hidden="true">
                ■
              </span>
              {c}
            </li>
          ))}
        </ul>
      </section>

      <DayFinish day={day.day} theme={day.theme} progress={progress} done={done} total={total} />
    </div>
  );
}
