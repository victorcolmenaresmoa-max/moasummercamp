import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireProfile } from '@/lib/supabase/session';
import { getOpenDays, isStaff } from '@/lib/access';
import {
  getWorkbook,
  totalFields,
  checkpointsPerDay,
  normalizeWorkbookRoute,
  WORKBOOK_ROUTE_TITLES,
  WORKBOOK_ROUTE_LABELS,
} from '@/lib/workbook';
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
  const route = normalizeWorkbookRoute(profile.workbook_route);
  const workbook = getWorkbook(route);
  const cpPerDay = checkpointsPerDay(route);
  const supabase = createClient();

  const staff = isStaff(profile);
  const [{ data: responses }, { data: checkpoints }, openDays] = await Promise.all([
    supabase.from('responses').select('day, value').eq('user_id', profile.id),
    supabase.from('checkpoints').select('day, status, submitted_at').eq('user_id', profile.id),
    staff ? Promise.resolve(new Set<number>([1, 2, 3, 4])) : getOpenDays(),
  ]);

  const answeredByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of responses ?? []) if (hasContent(row.value)) answeredByDay[row.day] = (answeredByDay[row.day] ?? 0) + 1;

  const approvedByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const pendingByDay: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const cp of checkpoints ?? []) {
    if (cp.status === 'approved') approvedByDay[cp.day] = (approvedByDay[cp.day] ?? 0) + 1;
    else if (cp.status === 'pending' && cp.submitted_at) pendingByDay[cp.day] = (pendingByDay[cp.day] ?? 0) + 1;
  }

  const answered = (day: number) => answeredByDay[day] ?? 0;
  const approved = (day: number) => approvedByDay[day] ?? 0;
  const pendingReview = (day: number) => pendingByDay[day] ?? 0;

  const totalDone = workbook.reduce((a, d) => a + answered(d.day), 0);
  const totalAll = workbook.reduce((a, d) => a + totalFields(d.day, route), 0);
  const globalPct = pct(totalDone, totalAll);

  const firstName = profile.full_name.split(' ')[0];
  const activeDay = workbook.find(
    (d) => openDays.has(d.day) && pct(answered(d.day), totalFields(d.day, route)) < 100,
  );

  return (
    <div className="space-y-8">
      <LabRealtime userId={profile.id} />

      <section className="card relative isolate overflow-hidden">
        <div className="relative bg-teal-500 px-6 py-8 text-white sm:px-8">
          <MoaPattern variant="soft" />
          <div className="relative">
            <div className="flex flex-wrap items-center gap-2">
              <p className="eyebrow text-sun-400">My workbook</p>
              <span className="chip bg-white/15 text-white">{WORKBOOK_ROUTE_LABELS[route]}</span>
            </div>
            <h1 className="h-display mt-2 text-3xl sm:text-4xl">Hello, {firstName}</h1>
            <p className="mt-1 text-sm font-semibold text-white/75">
              {WORKBOOK_ROUTE_TITLES[route]} · 4 Reading Labs
            </p>
          </div>
        </div>

        <div className="px-6 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-extrabold text-teal-800">Overall camp progress</span>
            <span className="h-display text-2xl text-teal-600">{globalPct}%</span>
          </div>
          <ProgressBar className="mt-2" value={globalPct} />
          <p className="mt-2 text-xs font-semibold text-ink/50">
            {totalDone} of {totalAll} fields completed
          </p>
        </div>
      </section>

      {activeDay && (
        <Link
          href={`/lab/${activeDay.day}`}
          prefetch={false}
          className="group flex items-center justify-between gap-4 rounded-3xl bg-sun-400 px-6 py-4 text-plum-500 shadow-pop transition hover:-translate-y-0.5"
        >
          <span>
            <span className="eyebrow block opacity-70">Continue where you left off</span>
            <span className="h-display mt-0.5 block text-lg">
              Day {activeDay.day} · {activeDay.theme}
            </span>
          </span>
          <span className="h-display shrink-0 text-2xl transition group-hover:translate-x-1">→</span>
        </Link>
      )}

      <section>
        <div className="mb-4 flex items-center gap-3">
          <Squiggle className="h-6 w-20 shrink-0 text-coral-500" />
          <h2 className="h-display text-xl text-teal-900">My 4 days</h2>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {workbook.map((d, i) => {
            const p = pct(answered(d.day), totalFields(d.day, route));
            const open = openDays.has(d.day);
            const pending = pendingReview(d.day);

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
                      <LockIcon className="h-3 w-3" /> Locked
                    </Badge>
                  )}
                </div>

                {open ? (
                  <>
                    <p className="mt-2 text-sm italic leading-relaxed text-ink/60">{d.guidingQuestion}</p>
                    <ProgressBar className="mt-4" value={p} />
                    <p className="mt-2 text-xs font-semibold text-ink/50">
                      {approved(d.day)}/{cpPerDay[d.day]} checkpoints approved
                      {pending ? ` · ${pending} under review` : ''} · {d.schedule}
                    </p>
                  </>
                ) : (
                  <p className="mt-3 flex items-start gap-2 rounded-2xl bg-plum-50/70 px-3 py-2.5 text-xs font-semibold leading-relaxed text-plum-400">
                    <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Your moderator will open this lab when the session begins.
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
                prefetch={false}
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

      <div className="flex items-start gap-4 rounded-3xl border-2 border-dashed border-teal-200 bg-white/60 p-5">
        <Burst className="mt-0.5 h-6 w-6 shrink-0 text-sun-500" />
        <p className="text-sm leading-relaxed text-ink/70">
          <strong className="text-teal-800">One day at a time.</strong> Each lab opens during its
          in-person session. When the day ends, return here and wait for the next one with your group.
          This screen updates automatically; no manual refresh is needed.
        </p>
      </div>
    </div>
  );
}
