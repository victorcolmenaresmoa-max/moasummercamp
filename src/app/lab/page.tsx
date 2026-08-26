import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/supabase/session';
import { WORKBOOK, totalFields, CHECKPOINTS_PER_DAY } from '@/lib/workbook';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { hasContent, pct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function LabHome() {
  const profile = await requireProfile();
  const supabase = createClient();

  const [{ data: responses }, { data: checkpoints }] = await Promise.all([
    supabase.from('responses').select('day, value').eq('user_id', profile.id),
    supabase.from('checkpoints').select('day, status').eq('user_id', profile.id),
  ]);

  const answered = (day: number) =>
    (responses ?? []).filter((r) => r.day === day && hasContent(r.value)).length;
  const approved = (day: number) =>
    (checkpoints ?? []).filter((c) => c.day === day && c.status === 'approved').length;

  const totalDone = [1, 2, 3, 4].reduce((a, d) => a + answered(d), 0);
  const totalAll = [1, 2, 3, 4].reduce((a, d) => a + totalFields(d), 0);

  return (
    <div className="space-y-8">
      <section className="card overflow-hidden">
        <div className="bg-brand-900 px-6 py-6 text-white">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-accent-400">Mi workbook</p>
          <h1 className="mt-1 font-serif text-3xl font-bold">Hola, {profile.full_name.split(' ')[0]}</h1>
          <p className="mt-1 text-sm text-white/70">Route 1 · Teachers A2/B1 · 4 Reading Labs</p>
        </div>
        <div className="px-6 py-5">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-brand-800">Progreso total del camp</span>
            <span className="font-bold text-brand-600">{pct(totalDone, totalAll)}%</span>
          </div>
          <ProgressBar className="mt-2" value={pct(totalDone, totalAll)} />
          <p className="mt-2 text-xs text-ink/55">{totalDone} de {totalAll} campos completados</p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        {WORKBOOK.map((d) => {
          const p = pct(answered(d.day), totalFields(d.day));
          return (
            <Link key={d.day} href={`/lab/${d.day}`} className="card group p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-600">Day {d.day} · {d.theme}</p>
                  <h2 className="mt-1 font-serif text-xl font-bold text-brand-900">{d.title}</h2>
                </div>
                <Badge tone={p === 100 ? 'success' : p > 0 ? 'accent' : 'neutral'}>{p}%</Badge>
              </div>
              <p className="mt-2 text-sm italic text-ink/65">{d.guidingQuestion}</p>
              <ProgressBar className="mt-4" value={p} />
              <p className="mt-2 text-xs text-ink/55">
                {approved(d.day)}/{CHECKPOINTS_PER_DAY[d.day]} checkpoints firmados · {d.schedule}
              </p>
            </Link>
          );
        })}
      </section>
    </div>
  );
}
