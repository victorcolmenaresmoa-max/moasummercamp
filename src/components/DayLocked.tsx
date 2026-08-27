import Link from 'next/link';
import { LockIcon, ArrowLeftIcon } from '@/components/ui/Icons';
import { MoaPattern, Gear, Squiggle } from '@/components/brand/Moa';
import type { Day } from '@/lib/workbook';

/**
 * Pantalla que ve el docente si intenta entrar a un dia que su moderador
 * todavia no ha abierto (por ejemplo escribiendo /lab/3 a mano).
 * No revela ni el texto de lectura ni las preguntas.
 */
export function DayLocked({ day }: { day: Day }) {
  return (
    <div className="space-y-6">
      <Link
        href="/lab"
        prefetch
        className="inline-flex items-center gap-2 text-sm font-bold text-teal-600 transition hover:text-teal-800"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        My dashboard
      </Link>

      <section className="card relative isolate overflow-hidden animate-pop-in">
        <div className="relative bg-plum-500 px-6 py-10 text-center text-white sm:px-10 sm:py-14">
          <MoaPattern variant="soft" />
          <div className="relative mx-auto max-w-lg">
            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-white/10 ring-2 ring-white/20">
              <LockIcon className="h-7 w-7 text-sun-400" />
            </span>

            <p className="eyebrow mt-6 text-sun-400">
              Day {day.day} · {day.theme}
            </p>
            <h1 className="h-display mt-2 text-3xl">This lab is not open yet</h1>
            <p className="mt-4 leading-relaxed text-white/75">
              Your moderator will activate it when this day&apos;s session begins. This keeps the camp
              in the classroom, with your group, and prevents anyone from arriving with answers prepared at home.
            </p>

            <Link href="/lab" className="btn-accent mt-8 px-7 py-3 text-base shadow-pop">
              Back to my dashboard
            </Link>
          </div>
          <Gear className="pointer-events-none absolute -bottom-8 -left-8 h-28 w-28 text-white/5" />
        </div>

        <div className="flex items-center gap-3 px-6 py-4 sm:px-10">
          <Squiggle className="h-5 w-16 shrink-0 text-coral-500" />
          <p className="text-xs font-semibold text-ink/55">
            While you wait, you can review the days you have already completed from your dashboard.
          </p>
        </div>
      </section>
    </div>
  );
}
