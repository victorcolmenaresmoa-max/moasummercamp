import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/supabase/session';
import { getOpenDays } from '@/lib/access';
import { WORKBOOK, totalFields, CHECKPOINTS_PER_DAY } from '@/lib/workbook';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { LabRealtime } from '@/components/LabRealtime';
import { LockIcon } from '@/components/ui/Icons';
import { MoaPattern, Squiggle, Arc, Burst } from '@/components/brand/Moa';
import { hasContent, pct } from '@/lib/utils';

export const dynamic = 'force-dynamic';

const DAY_TONE: Record<number, { chip: string }> = {
  1: { chip: 'bg-sun-400 text-plum-500' },
  2: { chip: 'bg-coral-500 text-white' },
  3: { chip: 'bg-plum-500 text-white' },
  4: { chip: 'bg-teal-600 text-white' },
};

export default async function LabHome() {
  const profile = await requireProfile();
  const supabase = createClient();

  // Consultas en paralelo, con solo las columnas necesarias.
  const [{ data: responses }, { data: checkpoints }, openDays] = await Promise.all([
    supabase.from('responses').select('day, value').eq('user_id', profile.id),
    supabase.from('checkpoints').select('day, status').eq('user_id', profile.id),
    getOpenDays(),
  ]);

  const answered = (day: number) => (responses ?? []).filter((r) => r.day === day && hasContent(r.value)).length;
  const approved = (day: number) => (checkpoints ?? []).filter((c) => c.day === day && c.status === 'approved').length;

  const totalDone = [1, 2, 3, 4].reduce((a, d) => a + answered(d), 0);
  const totalAll = [1, 2, 3, 4].reduce((a, d) => a + totalFields(d), 0);
  const globalPct = pct(totalDone, totalAll);

  const firstName = profile.full_name.split(' ')[0];
  const activeDay = WORKBOOK.find((d) => openDays.has(d.day) && pct(answered(d.day), totalFields(d.day)) < 100);

  return (
    <div className="space-y-8">
      {/* El candado se abre solo cuando el moderador activa el dia. */}
      <LabRealtime userId={profile.id} />

      {/* --------------------------------------------------------- PORTADA */}
      <section className="card relative isolate overflow-hidden">
        <div className="relative bg-teal-500 px-6 py-8 text-white sm:px-8">
          <MoaPattern variant="soft" />
          <div className="relative">
            <p className="eyebrow text-sun-400">Mi workbook</p>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl">Hola, {firstName}</h1>
            <p className="mt-1 text-sm font-semibold text-white/75">
              Route 1 · Teachers A2/B1 · 4 Reading Labs
            </p>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-extrabold text-teal-800">Progreso total del camp</span>
            <span className="h-display text-2xl text-teal-600">{globalPct}%</span>
          </div>
          <ProgressBar className="mt-2" value={globalPct} />
          <p className="mt-2 text-xs font-semibold text-ink/50">
            {totalDone} de {totalAll} campos completados
          </p>
        </div>
      </section>

      {/* ---------------------------------------------- ATAJO AL DÍA ACTIVO */}
      {activeDay && (
        <Link
          href={`/lab/${activeDay.day}`}
          prefetch
          className="group flex items-center justify-between gap-4 rounded-3xl bg-sun-400 px-6 py-4 text-plum-500 shadow-pop transition hover:-translate-y-0.5"
        >
          <span>
            <span className="eyebrow block opacity-70">Continuar donde lo dejaste</span>
            <span className="h-display mt-0.5 block text-lg">
              Day {activeDay.day} · {activeDay.theme}
            </span>
          </span>
          <span className="h-display shrink-0 text-2xl transition group-hover:translate-x-1">→</span>
        </Link>
      )}

      {/* -------------------------------------------------------- LOS 4 DÍAS */}
      <section>
        <div className="mb-4 flex items-center gap-3">
          <Squiggle className="h-6 w-20 shrink-0 text-coral-500" />
          <h2 className="h-display text-xl text-teal-900">Mis 4 días</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {WORKBOOK.map((d, i) => {
            const p = pct(answered(d.day), totalFields(d.day));
            const open = openDays.has(d.day);

            const inner = (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className={`chip ${open ? DAY_TONE[d.day].chip : 'bg-plum-50 text-plum-300'}`}>
                      Day {d.day} · {d.theme}
                    </span>
                    <h3 className={`h-display mt-2.5 text-xl ${open ? 'text-teal-900' : 'text-plum-300'}`}>
                      {d.title}
                    </h3>
                  </div>
                  {open ? (
                    <Badge tone={p === 100 ? 'success' : p > 0 ? 'accent' : 'neutral'}>{p}%</Badge>
                  ) : (
                    <Badge tone="locked">
                      <LockIcon className="h-3 w-3" /> Cerrado
                    </Badge>
                  )}
                </div>

                {open ? (
                  <>
                    <p className="mt-2 text-sm italic leading-relaxed text-ink/60">{d.guidingQuestion}</p>
                    <ProgressBar className="mt-4" value={p} />
                    <p className="mt-2 text-xs font-semibold text-ink/50">
                      {approved(d.day)}/{CHECKPOINTS_PER_DAY[d.day]} checkpoints firmados · {d.schedule}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 flex items-start gap-2 rounded-2xl bg-plum-50/70 px-3 py-2.5 text-xs font-semibold leading-relaxed text-plum-400">
                    <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Tu moderador abrirá este laboratorio cuando empiece la sesión.
                  </p>
                )}

                <Arc
                  className={`pointer-events-none absolute -bottom-4 -right-4 h-12 w-24 ${
                    open ? 'text-teal-50' : 'text-plum-50'
                  }`}
                />
              </>
            );

            const base = 'card relative overflow-hidden p-5 animate-fade-up';
            const style = { animationDelay: `${i * 60}ms` };

            return open ? (
              <Link
                key={d.day}
                href={`/lab/${d.day}`}
                prefetch
                style={style}
                className={`${base} group transition hover:-translate-y-1 hover:shadow-moa-lg`}
              >
                {inner}
              </Link>
            ) : (
              <div key={d.day} style={style} aria-disabled="true" className={`${base} cursor-not-allowed bg-white/60`}>
                {inner}
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------------- NOTA */}
      <div className="flex items-start gap-4 rounded-3xl border-2 border-dashed border-teal-200 bg-white/60 p-5">
        <Burst className="mt-0.5 h-6 w-6 shrink-0 text-sun-500" />
        <p className="text-sm leading-relaxed text-ink/70">
          <strong className="text-teal-800">Un día a la vez.</strong> Cada laboratorio se abre en su
          sesión presencial. Al terminar el día vuelves aquí y esperas al siguiente con tu grupo.
          Esta pantalla se actualiza sola: no hace falta refrescar.
        </p>
      </div>
    </div>
  );
}
