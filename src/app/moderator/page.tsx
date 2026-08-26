import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/supabase/session';
import { CAMPUS_LABELS, totalFields, CHECKPOINTS_PER_DAY, TOTAL_CHECKPOINTS, WORKBOOK } from '@/lib/workbook';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Badge } from '@/components/ui/Badge';
import { ModeratorRealtime } from '@/components/moderator/ModeratorRealtime';
import { DayAccessControl } from '@/components/moderator/DayAccessControl';
import { DeleteParticipantButton } from '@/components/moderator/DeleteParticipantButton';
import { Squiggle } from '@/components/brand/Moa';
import { pct, timeAgo } from '@/lib/utils';
import type { Campus, DayAccessRow, ParticipantProgressRow } from '@/types/database';

export const dynamic = 'force-dynamic';

type Search = { campus?: string; day?: string; q?: string };

export default async function ModeratorDashboard({ searchParams }: { searchParams: Search }) {
  const staff = await requireStaff();
  const isAdmin = staff.role === 'admin';
  const supabase = createClient();

  const dayFilter = Number(searchParams.day ?? 0) || 0;

  let query = supabase.from('participant_progress').select('*').order('full_name');
  if (searchParams.campus) query = query.eq('campus', searchParams.campus as Campus);
  // Filtrado en Postgres, no en JS: menos datos viajando por la red.
  if (searchParams.q) query = query.ilike('full_name', `%${searchParams.q}%`);

  const [{ data }, { data: access }] = await Promise.all([
    query,
    supabase.from('day_access').select('*').order('day'),
  ]);

  const rows = (data ?? []) as ParticipantProgressRow[];
  const accessRows = (access ?? []) as DayAccessRow[];

  const dayAnswers = (r: ParticipantProgressRow, d: number) =>
    [r.day1_answers, r.day2_answers, r.day3_answers, r.day4_answers][d - 1] ?? 0;

  const totalAllDays = [1, 2, 3, 4].reduce((a, d) => a + totalFields(d), 0);

  const overall = (r: ParticipantProgressRow) =>
    dayFilter
      ? pct(dayAnswers(r, dayFilter), totalFields(dayFilter))
      : pct([1, 2, 3, 4].reduce((a, d) => a + dayAnswers(r, d), 0), totalAllDays);

  const active = rows.filter(
    (r) => r.last_activity && Date.now() - new Date(r.last_activity).getTime() < 20 * 60_000,
  );

  const openDaysLabel =
    accessRows
      .filter((a) => a.campus === null && a.is_open)
      .map((a) => `D${a.day}`)
      .join(' · ') || 'ninguno';

  return (
    <div className="space-y-6">
      <ModeratorRealtime />

      {/* ------------------------------------------------------------- KPIs */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi label="Participantes" value={String(rows.length)} tone="teal" />
        <Kpi label="Activos (20 min)" value={String(active.length)} tone="moss" />
        <Kpi
          label="Avance promedio"
          value={`${rows.length ? Math.round(rows.reduce((a, r) => a + overall(r), 0) / rows.length) : 0}%`}
          tone="sun"
        />
        <Kpi
          label="Checkpoints firmados"
          value={`${rows.reduce((a, r) => a + r.checkpoints_approved, 0)}/${rows.length * TOTAL_CHECKPOINTS}`}
          tone="coral"
        />
      </section>

      {/* -------------------------------------------- APERTURA DE DÍAS */}
      <DayAccessControl rows={accessRows} />

      {/* ---------------------------------------------------------- FILTROS */}
      <form className="card flex flex-wrap items-end gap-3 p-5" method="get">
        <div>
          <label className="label text-xs" htmlFor="f-campus">Sede</label>
          <select id="f-campus" name="campus" defaultValue={searchParams.campus ?? ''} className="input mt-1.5 w-44">
            <option value="">Todas</option>
            <option value="merida">Mérida</option>
            <option value="el_vigia">El Vigía</option>
          </select>
        </div>
        <div>
          <label className="label text-xs" htmlFor="f-day">Día</label>
          <select id="f-day" name="day" defaultValue={searchParams.day ?? ''} className="input mt-1.5 w-48">
            <option value="">Todo el camp</option>
            {WORKBOOK.map((d) => (
              <option key={d.day} value={d.day}>
                Day {d.day} · {d.theme}
              </option>
            ))}
          </select>
        </div>
        <div className="grow">
          <label className="label text-xs" htmlFor="f-q">Buscar docente</label>
          <input id="f-q" name="q" defaultValue={searchParams.q ?? ''} className="input mt-1.5" placeholder="Nombre…" />
        </div>
        <button className="btn-primary">Filtrar</button>
        <Link href="/moderator" className="btn-ghost">Limpiar</Link>
      </form>

      {/* ----------------------------------------------------------- TABLA */}
      <section className="card overflow-hidden">
        <div className="flex items-center gap-3 border-b-2 border-teal-50 px-5 py-4">
          <Squiggle className="h-5 w-16 shrink-0 text-coral-500" />
          <h2 className="h-display text-lg text-teal-900">Participantes</h2>
          <span className="ml-auto text-xs font-bold text-ink/45">Días abiertos: {openDaysLabel}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-teal-50/80 text-left">
              <tr className="eyebrow text-teal-700">
                <th className="px-4 py-3">Docente</th>
                <th className="px-4 py-3">Sede</th>
                <th className="w-56 px-4 py-3">{dayFilter ? `Avance Day ${dayFilter}` : 'Avance total'}</th>
                <th className="px-4 py-3">D1</th>
                <th className="px-4 py-3">D2</th>
                <th className="px-4 py-3">D3</th>
                <th className="px-4 py-3">D4</th>
                <th className="px-4 py-3">Checkpoints</th>
                <th className="px-4 py-3">Actividad</th>
                <th className="px-4 py-3">Reporte IA</th>
                <th className="px-4 py-3" />
                {isAdmin && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-teal-50 transition hover:bg-teal-50/40">
                  <td className="px-4 py-3 font-extrabold text-teal-900">{r.full_name}</td>
                  <td className="px-4 py-3 text-ink/65">{r.campus ? CAMPUS_LABELS[r.campus] : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <ProgressBar value={overall(r)} className="w-28" />
                      <span className="text-xs font-extrabold text-teal-600">{overall(r)}%</span>
                    </div>
                  </td>
                  {[1, 2, 3, 4].map((d) => {
                    const p = pct(dayAnswers(r, d), totalFields(d));
                    return (
                      <td key={d} className="px-4 py-3">
                        <span
                          className={`text-xs font-bold ${
                            p === 100 ? 'text-moss-600' : p > 0 ? 'text-teal-600' : 'text-ink/30'
                          }`}
                        >
                          {p}%
                        </span>
                      </td>
                    );
                  })}
                  <td className="px-4 py-3">
                    <Badge tone={r.checkpoints_approved >= TOTAL_CHECKPOINTS ? 'success' : 'neutral'}>
                      {r.checkpoints_approved}/{TOTAL_CHECKPOINTS}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-xs font-semibold text-ink/55">{timeAgo(r.last_activity)}</td>
                  <td className="px-4 py-3">
                    {r.last_report_at ? <Badge tone="success">Generado</Badge> : <Badge tone="warn">Pendiente</Badge>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/moderator/participant/${r.id}`} prefetch={false} className="btn-ghost btn-sm">
                      Abrir
                    </Link>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <DeleteParticipantButton participantId={r.id} participantName={r.full_name} />
                    </td>
                  )}
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={isAdmin ? 12 : 11} className="px-4 py-14 text-center font-semibold text-ink/45">
                    No hay participantes con esos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isAdmin && (
        <p className="text-xs font-semibold text-ink/40">
          Como administrador puedes eliminar cuentas de participantes. Borra su workbook completo y
          libera el correo para volver a registrarse.
        </p>
      )}

      <p className="text-xs font-semibold text-ink/40">
        Checkpoints por día: {Object.entries(CHECKPOINTS_PER_DAY).map(([d, n]) => `D${d}: ${n}`).join(' · ')}
      </p>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'teal' | 'sun' | 'coral' | 'moss';
}) {
  const bar = { teal: 'bg-teal-500', sun: 'bg-sun-400', coral: 'bg-coral-500', moss: 'bg-moss-500' }[tone];
  return (
    <div className="card p-5">
      <div className={`mb-3 h-1.5 w-10 rounded-full ${bar}`} />
      <p className="text-xs font-bold uppercase tracking-wide text-ink/50">{label}</p>
      <p className="h-display mt-1 text-3xl text-teal-900">{value}</p>
    </div>
  );
}
