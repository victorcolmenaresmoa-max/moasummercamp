import Link from 'next/link';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/supabase/session';
import { getDay } from '@/lib/workbook';
import { ReadingText } from '@/components/ReadingText';
import { WorkbookField } from '@/components/WorkbookField';
import { CheckpointBox } from '@/components/CheckpointBox';
import type { CheckpointRow, ResponseRow } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function DayPage({ params }: { params: { day: string } }) {
  const dayNumber = Number(params.day);
  const day = getDay(dayNumber);
  if (!day) notFound();

  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: responses }, { data: checkpoints }] = await Promise.all([
    supabase.from('responses').select('*').eq('user_id', profile.id).eq('day', dayNumber),
    supabase.from('checkpoints').select('*').eq('user_id', profile.id).eq('day', dayNumber),
  ]);

  const answers = new Map((responses ?? []).map((r: ResponseRow) => [r.field_key, r.value]));
  const cps = new Map((checkpoints ?? []).map((c: CheckpointRow) => [c.checkpoint_number, c]));

  const prev = getDay(dayNumber - 1);
  const next = getDay(dayNumber + 1);

  return (
    <div className="space-y-8">
      {/* Cabecera del dia */}
      <header className="card overflow-hidden">
        <div className="bg-gradient-to-r from-brand-900 to-brand-700 px-6 py-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-400">
            Day {day.day} · {day.theme}
          </p>
          <h1 className="mt-1 font-serif text-3xl font-bold">{day.title}</h1>
          <p className="mt-2 text-sm text-white/80">Guiding question: {day.guidingQuestion}</p>
          <p className="mt-1 text-xs text-white/60">Reading Lab: {day.schedule}</p>
        </div>
        <div className="px-6 py-5">
          <p className="text-xs font-bold uppercase tracking-wide text-brand-700">By the end of this lab I will be able to…</p>
          <ul className="mt-2 grid gap-1 text-sm text-ink/75 sm:grid-cols-2">
            {day.objectives.map((o) => (
              <li key={o} className="flex gap-2"><span className="text-accent-500">▸</span>{o}</li>
            ))}
          </ul>
        </div>
      </header>

      <ReadingText title={day.reading.title} blocks={day.reading.blocks} />

      {/* Secciones */}
      {day.sections.map((section) => (
        <section key={section.id} className="card p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-brand-50 pb-3">
            <h2 className="font-serif text-xl font-bold text-brand-900">{section.title}</h2>
            {section.minutes && (
              <span className="chip bg-brand-50 text-brand-600">{section.minutes} min</span>
            )}
          </div>
          {section.intro && <p className="mt-3 text-sm text-ink/70">{section.intro}</p>}

          <div className="mt-5 space-y-6">
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
            <div className="mt-6">
              <CheckpointBox checkpoint={section.checkpoint} row={cps.get(section.checkpoint.number)} />
            </div>
          )}
        </section>
      ))}

      {/* Checklist final */}
      <section className="card p-6">
        <h2 className="font-serif text-xl font-bold text-brand-900">MY EVIDENCE FOR TODAY</h2>
        <ul className="mt-3 space-y-1 text-sm text-ink/75">
          {day.finalChecklist.map((c) => (
            <li key={c} className="flex gap-2"><span className="text-brand-300">□</span>{c}</li>
          ))}
        </ul>
      </section>

      {/* Navegacion */}
      <nav className="flex items-center justify-between no-print">
        {prev ? (
          <Link href={`/lab/${prev.day}`} className="btn-ghost">← Day {prev.day} · {prev.theme}</Link>
        ) : <span />}
        {next ? (
          <Link href={`/lab/${next.day}`} className="btn-primary">Day {next.day} · {next.theme} →</Link>
        ) : (
          <Link href="/lab" className="btn-primary">Volver a mi workbook</Link>
        )}
      </nav>
    </div>
  );
}
