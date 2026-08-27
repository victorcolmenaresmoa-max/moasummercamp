import Link from 'next/link';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { CheckIcon } from '@/components/ui/Icons';
import { Burst, Arc } from '@/components/brand/Moa';

/**
 * Cierre del dia.
 *
 * DECISION DE PRODUCTO: aqui NO hay boton "continuar al Dia siguiente".
 * El unico camino es volver al panel; el dia siguiente lo abre el moderador
 * en su sesion. Asi el ritmo del camp lo marca el aula, no la app.
 */
export function DayFinish({
  day,
  theme,
  progress,
  done,
  total,
}: {
  day: number;
  theme: string;
  progress: number;
  done: number;
  total: number;
}) {
  const complete = progress >= 100;

  return (
    <section
      className={`card relative overflow-hidden p-6 text-center sm:p-8 no-print ${
        complete ? 'bg-moss-50' : ''
      }`}
    >
      <Arc className="pointer-events-none absolute -left-6 -top-3 h-14 w-28 text-teal-50" />
      <Burst className="pointer-events-none absolute -right-5 -bottom-5 h-20 w-20 text-sun-100" />

      <div className="relative mx-auto max-w-lg">
        {complete ? (
          <>
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-moss-500 text-white">
              <CheckIcon className="h-6 w-6" />
            </span>
            <h2 className="h-display mt-4 text-2xl text-teal-900">
              Day {day} complete!
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              You finished {theme}. Let your moderator know so they can review your checkpoints.
              The next lab will open during its scheduled session.
            </p>
          </>
        ) : (
          <>
            <h2 className="h-display text-2xl text-teal-900">End of Day {day}</h2>
            <p className="mt-2 text-sm leading-relaxed text-ink/65">
              You still have <strong className="text-teal-700">{total - done}</strong> fields to answer.
              You can return anytime: everything is saved automatically.
            </p>
          </>
        )}

        <div className="mx-auto mt-5 max-w-xs">
          <ProgressBar value={progress} />
          <p className="mt-2 text-xs font-bold text-ink/50">
            {done} of {total} fields · {progress}%
          </p>
        </div>

        <Link href="/lab" prefetch={false} className="btn-primary mt-7 px-7 py-3 text-base">
          Back to my dashboard
        </Link>

        <p className="mt-4 text-xs font-semibold text-ink/40">
          {day < 4
            ? `Your moderator will open Day ${day + 1} when the next session begins.`
            : 'This is the final lab: your moderator will generate your final report.'}
        </p>
      </div>
    </section>
  );
}
