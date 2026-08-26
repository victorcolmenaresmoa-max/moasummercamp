import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/supabase/session';
import { CAMPUS_LABELS, totalFields, CHECKPOINTS_PER_DAY, TOTAL_CHECKPOINTS } from '@/lib/workbook';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { RealtimeRefresh } from '@/components/moderator/RealtimeRefresh';
import { pct, timeAgo } from '@/lib/utils';
import type { Campus, ParticipantProgressRow } from '@/types/database';

export const dynamic = 'force-dynamic';

type Search = { campus?: string; day?: string; q?: string };

export default async function ModeratorDashboard({ searchParams }: { searchParams: Search }) {
  await requireStaff();
  const supabase = createClient();

  const dayFilter = Number(searchParams.day ?? 0) || 0;

  let query = supabase.from('participant_progress').select('*').order('full_name');
  if (searchParams.campus) query = query.eq('campus', searchParams.campus as Campus);
  const { data } = await query;

  let rows = (data ?? []) as ParticipantProgressRow[];
  if (searchParams.q) {
    const q = searchParams.q.toLowerCase();
    rows = rows.filter((r) => r.full_name.toLowerCase().includes(q));
  }

  const dayAnswers = (r: ParticipantProgressRow, d: number) =>
    [r.day1_answers, r.day2_answers, r.day3_answers, r.day4_answers][d - 1] ?? 0;

  const overall = (r: ParticipantProgressRow) =>
    dayFilter
      ? pct(dayAnswers(r, dayFilter), totalFields(dayFilter))
      : pct(
          [1, 2, 3, 4].reduce((a, d) => a + dayAnswers(r, d), 0),
          [1, 2, 3, 4].reduce((a, d) => a + totalFields(d), 0),
        );

  const active = rows.filter((r) => r.last_activity && Date.now() - new Date(r.last_activity).getTime() < 20 * 60_000);

  return (
    <div className="space-y-6">
      <RealtimeRefresh />

      {/* KPIs */}
      <section className="grid gap-4 sm:grid-cols-4">
        <Kpi label="Participantes" value={String(rows.length)} />
        <Kpi label="Activos (20 min)" value={String(active.length)} tone="success" />
        <Kpi
          label="Avance promedio"
          value={`${rows.length ? Math.round(rows.reduce((a, r) => a + overall(r), 0) / rows.length) : 0}%`}
        />
        <Kpi
          label="Checkpoints firmados"
          value={`${rows.reduce((a, r) => a + r.checkpoints_approved, 0)} / ${rows.length * TOTAL_CHECKPOINTS}`}
          tone="accent"
        />
      </section>

      {/* Filtros */}
      <form className="card flex flex-wrap items-end gap-3 p-4" method="get">
        <div>
          <label className="label text-xs">Sede</label>
          <select name="campus" defaultValue={searchParams.campus ?? ''} className="input mt-1 w-44">
            <option value="">Todas</option>
            <option value="merida">Mérida</option>
            <option value="el_vigia">El Vigía</option>
          </select>
        </div>
        <div>
          <label className="label text-xs">Día</label>
          <select name="day" defaultValue={searchParams.day ?? ''} className="input mt-1 w-44">
            <option value="">Todo el camp</option>
            <option value="1">Day 1 · Identity</option>
            <option value="2">Day 2 · Clarity</option>
            <option value="3">Day 3 · Decision</option>
            <option value="4">Day 4 · Growth</option>
          </select>
        </div>
        <div className="grow">
          <label className="label text-xs">Buscar docente</label>
          <input name="q" defaultValue={searchParams.q ?? ''} className="input mt-1" placeholder="Nombre…" />
        </div>
        <button className="btn-primary">Filtrar</button>
        <Link href="/moderator" className="btn-ghost">Limpiar</Link>
      </form>

      {/* Tabla */}
      <section className="card overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-brand-50 text-left text-xs font-bold uppercase tracking-wide text-brand-700">
            <tr>
              <th className="px-4 py-3">Docente</th>
              <th className="px-4 py-3">Sede</th>
              <th className="px-4 py-3 w-56">{dayFilter ? `Avance Day ${dayFilter}` : 'Avance total'}</th>
              <th className="px-4 py-3">D1</th>
              <th className="px-4 py-3">D2</th>
              <th className="px-4 py-3">D3</th>
              <th className="px-4 py-3">D4</th>
              <th className="px-4 py-3">Checkpoints</th>
              <th className="px-4 py-3">Última actividad</th>
              <th className="px-4 py-3">Reporte IA</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-brand-50 hover:bg-brand-50/40">
                <td className="px-4 py-3 font-semibold text-brand-900">{r.full_name}</td>
                <td className="px-4 py-3 text-ink/70">{r.campus ? CAMPUS_LABELS[r.campus] : '—'}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <ProgressBar value={overall(r)} className="w-32" />
                    <span className="text-xs font-bold text-brand-600">{overall(r)}%</span>
                  </div>
                </td>
                {[1, 2, 3, 4].map((d) => (
                  <td key={d} className="px-4 py-3 text-xs text-ink/70">
                    {pct(dayAnswers(r, d), totalFields(d))}%
                  </td>
                ))}
                <td className="px-4 py-3">
                  <Badge tone={r.checkpoints_approved >= TOTAL_CHECKPOINTS ? 'success' : 'neutral'}>
                    {r.checkpoints_approved}/{TOTAL_CHECKPOINTS}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-ink/60">{timeAgo(r.last_activity)}</td>
                <td className="px-4 py-3">
                  {r.last_report_at ? <Badge tone="success">Generado</Badge> : <Badge tone="warn">Pendiente</Badge>}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/moderator/participant/${r.id}`} className="btn-ghost py-1">Abrir</Link>
                </td>
              </tr>
            ))}
            {!rows.length && (
              <tr>
                <td colSpan={11} className="px-4 py-10 text-center text-ink/50">
                  No hay participantes con esos filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <p className="text-xs text-ink/45">
        Checkpoints por día: {Object.entries(CHECKPOINTS_PER_DAY).map(([d, n]) => `D${d}: ${n}`).join(' · ')}
      </p>
    </div>
  );
}

function Kpi({ label, value, tone = 'neutral' }: { label: string; value: string; tone?: 'neutral' | 'success' | 'accent' }) {
  const bar = { neutral: 'bg-brand-500', success: 'bg-moss-500', accent: 'bg-accent-500' }[tone];
  return (
    <div className="card overflow-hidden p-5">
      <div className={`mb-3 h-1 w-10 rounded-full ${bar}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-ink/55">{label}</p>
      <p className="mt-1 font-serif text-3xl font-bold text-brand-900">{value}</p>
    </div>
  );
}
