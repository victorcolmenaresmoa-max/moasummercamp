import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/supabase/session';
import {
  CAMPUS_LABELS,
  totalFields,
  totalCheckpoints,
  normalizeWorkbookRoute,
  WORKBOOK_ROUTE_LABELS,
  WORKBOOK_DAY_NUMBERS,
} from '@/lib/workbook';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { ModeratorRealtime } from '@/components/moderator/ModeratorRealtime';
import { DayAccessControl } from '@/components/moderator/DayAccessControl';
import { DeleteParticipantButton } from '@/components/moderator/DeleteParticipantButton';
import { TelegramTestButton } from '@/components/moderator/TelegramTestButton';
import { Squiggle } from '@/components/brand/Moa';
import { formatDuration, labSessionSeconds, pct, timeAgo } from '@/lib/utils';
import type { Campus, DayAccessRow, LabTimeSessionRow, ParticipantProgressRow, WorkbookRoute } from '@/types/database';

export const dynamic = 'force-dynamic';

type Search = { campus?: string; day?: string; q?: string; route?: string };

export default async function ModeratorDashboard({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const isAdmin = staff.role === 'admin';
  const supabase = createClient();
  const dayFilter = Number(searchParams.day ?? 0) || 0;

  let query = supabase.from('participant_progress').select('*').order('full_name');
  if (searchParams.campus) query = query.eq('campus', searchParams.campus as Campus);
  if (searchParams.route === 'a2_b1' || searchParams.route === 'b2_c1') {
    query = query.eq('workbook_route', searchParams.route as WorkbookRoute);
  }
  if (searchParams.q) query = query.ilike('full_name', `%${searchParams.q}%`);

  let timeQuery = supabase
    .from('lab_time_sessions')
    .select('user_id, day, started_at, last_seen_at, ended_at');
  if (dayFilter) timeQuery = timeQuery.eq('day', dayFilter);

  const [{ data }, { data: access }, { data: timeSessions }] = await Promise.all([
    query,
    supabase.from('day_access').select('*').order('day'),
    timeQuery,
  ]);

  const rows = (data ?? []) as ParticipantProgressRow[];
  const accessRows = (access ?? []) as DayAccessRow[];
  const timeRows = (timeSessions ?? []) as Pick<LabTimeSessionRow, 'user_id' | 'day' | 'started_at' | 'last_seen_at' | 'ended_at'>[];
  const timeSecondsByUser = new Map<string, number>();
  for (const session of timeRows) {
    timeSecondsByUser.set(
      session.user_id,
      (timeSecondsByUser.get(session.user_id) ?? 0) + labSessionSeconds(session),
    );
  }

  const dayAnswers = (r: ParticipantProgressRow, d: number) =>
    [r.day1_answers, r.day2_answers, r.day3_answers, r.day4_answers][d - 1] ?? 0;

  const overall = (r: ParticipantProgressRow) => {
    const route = normalizeWorkbookRoute(r.workbook_route);
    return dayFilter
      ? pct(dayAnswers(r, dayFilter), totalFields(dayFilter, route))
      : pct(
          WORKBOOK_DAY_NUMBERS.reduce((a, d) => a + dayAnswers(r, d), 0),
          WORKBOOK_DAY_NUMBERS.reduce((a, d) => a + totalFields(d, route), 0),
        );
  };

  const active = rows.filter(
    (r) => r.last_activity && Date.now() - new Date(r.last_activity).getTime() < 20 * 60_000,
  );
  const totalPending = rows.reduce((a, r) => a + Number(r.checkpoints_pending_review ?? 0), 0);
  const totalApproved = rows.reduce((a, r) => a + Number(r.checkpoints_approved ?? 0), 0);
  const totalPossible = rows.reduce((a, r) => a + totalCheckpoints(normalizeWorkbookRoute(r.workbook_route)), 0);

  const openDaysLabel =
    accessRows
      .filter((a) => a.campus === null && a.is_open)
      .map((a) => `D${a.day}`)
      .join(' · ') || 'none';

  return (
    <div className="space-y-6">
      <ModeratorRealtime />

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Kpi label="Participants" value={String(rows.length)} tone="teal" />
        <Kpi label="Active (20 min)" value={String(active.length)} tone="moss" />
        <Kpi label="To review" value={String(totalPending)} tone="coral" />
        <Kpi
          label="Average progress"
          value={`${rows.length ? Math.round(rows.reduce((a, r) => a + overall(r), 0) / rows.length) : 0}%`}
          tone="sun"
        />
        <Kpi label="Approved checkpoints" value={`${totalApproved}/${totalPossible}`} tone="teal" />
      </section>

      <DayAccessControl rows={accessRows} />
      <TelegramTestButton />

      <form className="card flex flex-wrap items-end gap-3 p-5" method="get">
        <div>
          <label className="label text-xs" htmlFor="f-campus">Campus</label>
          <select id="f-campus" name="campus" defaultValue={searchParams.campus ?? ''} className="input mt-1.5 w-44">
            <option value="">All</option>
            <option value="merida">Mérida</option>
            <option value="el_vigia">El Vigía</option>
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="f-route">Route</label>
          <select id="f-route" name="route" defaultValue={searchParams.route ?? ''} className="input mt-1.5 w-40">
            <option value="">Both</option>
            <option value="a2_b1">A2–B1</option>
            <option value="b2_c1">B2–C1</option>
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="f-day">Day</label>
          <select id="f-day" name="day" defaultValue={searchParams.day ?? ''} className="input mt-1.5 w-36">
            <option value="">Entire camp</option>
            {WORKBOOK_DAY_NUMBERS.map((d) => <option key={d} value={d}>Day {d}</option>)}
          </select>
        </div>
        <div className="grow">
          <label className="label text-xs" htmlFor="f-q">Search participant</label>
          <input id="f-q" name="q" defaultValue={searchParams.q ?? ''} className="input mt-1.5" placeholder="Name…" />
        </div>
        <button className="btn-primary">Filter</button>
        <Link href="/moderator" className="btn-ghost">Clear</Link>
      </form>

      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-teal-50 px-5 py-4">
          <Squiggle className="h-5 w-16 shrink-0 text-coral-500" />
          <h2 className="h-display text-lg text-teal-900">Participants</h2>
          <span className="ml-auto text-xs font-bold text-ink/45">Open days: {openDaysLabel}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1220px] text-sm">
            <thead className="bg-teal-50/80 text-left">
              <tr className="eyebrow text-teal-700">
                <th className="px-4 py-3">Participant</th>
                <th className="px-4 py-3">Route</th>
                <th className="px-4 py-3">Campus</th>
                <th className="w-56 px-4 py-3">{dayFilter ? `Day progress ${dayFilter}` : 'Overall progress'}</th>
                <th className="px-4 py-3">D1</th>
                <th className="px-4 py-3">D2</th>
                <th className="px-4 py-3">D3</th>
                <th className="px-4 py-3">D4</th>
                <th className="px-4 py-3">Checkpoints</th>
                <th className="px-4 py-3">To review</th>
                <th className="px-4 py-3">Activity</th>
                <th className="px-4 py-3">Lab time</th>
                <th className="px-4 py-3">AI report</th>
                <th className="px-4 py-3" />
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const route = normalizeWorkbookRoute(r.workbook_route);
                const checkpointTotal = totalCheckpoints(route);
                return (
                  <tr key={r.id} className="border-t border-teal-50 transition hover:bg-teal-50/40">
                    <td className="px-4 py-3 font-extrabold text-teal-900">{r.full_name}</td>
                    <td className="px-4 py-3"><Badge tone="accent">{WORKBOOK_ROUTE_LABELS[route]}</Badge></td>
                    <td className="px-4 py-3 text-ink/65">{r.campus ? CAMPUS_LABELS[r.campus] : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ProgressBar value={overall(r)} className="w-28" />
                        <span className="text-xs font-extrabold text-teal-600">{overall(r)}%</span>
                      </div>
                    </td>
                    {WORKBOOK_DAY_NUMBERS.map((d) => {
                      const p = pct(dayAnswers(r, d), totalFields(d, route));
                      return (
                        <td key={d} className="px-4 py-3">
                          <span className={`text-xs font-bold ${p === 100 ? 'text-moss-600' : p > 0 ? 'text-teal-600' : 'text-ink/30'}`}>{p}%</span>
                        </td>
                      );
                    })}
                    <td className="px-4 py-3">
                      <Badge tone={r.checkpoints_approved >= checkpointTotal ? 'success' : 'neutral'}>
                        {r.checkpoints_approved}/{checkpointTotal}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {r.checkpoints_pending_review > 0 ? <Badge tone="warn">{r.checkpoints_pending_review}</Badge> : <span className="text-ink/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-semibold text-ink/55">{timeAgo(r.last_activity)}</td>
                    <td className="px-4 py-3 text-xs font-extrabold text-teal-700">{formatDuration(timeSecondsByUser.get(r.id) ?? 0)}</td>
                    <td className="px-4 py-3">{r.last_report_at ? <Badge tone="success">Generated</Badge> : <Badge tone="warn">Pending</Badge>}</td>
                    <td className="px-4 py-3">
                      <Link href={`/moderator/participant/${r.id}`} prefetch={false} className="btn-ghost btn-sm">Open</Link>
                    </td>
                    {isAdmin && (
                      <td className="px-4 py-3"><DeleteParticipantButton participantId={r.id} participantName={r.full_name} /></td>
                    )}
                  </tr>
                );
              })}
              {!rows.length && (
                <tr>
                  <td colSpan={isAdmin ? 15 : 14} className="px-4 py-14 text-center font-semibold text-ink/45">
                    No participants match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <p className="text-xs font-semibold text-ink/40">
          As an administrator, you can delete participant accounts. This removes the entire workbook and frees the email address so it can be registered again.
        </p>
      )}
    </div>
  );
}

function Kpi({ label, value, tone }: { label: string; value: string; tone: 'teal' | 'sun' | 'coral' | 'moss' }) {
  const bar = { teal: 'bg-teal-500', sun: 'bg-sun-400', coral: 'bg-coral-500', moss: 'bg-moss-500' }[tone];
  return (
    <div className="card p-5">
      <div className={`mb-3 h-1.5 w-10 rounded-full ${bar}`} />
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="h-display mt-1 text-3xl text-teal-900">{value}</p>
    </div>
  );
}
