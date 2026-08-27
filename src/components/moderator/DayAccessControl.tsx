'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LockIcon, UnlockIcon } from '@/components/ui/Icons';
import { Squiggle } from '@/components/brand/Moa';
import type { Campus, DayAccessRow } from '@/types/database';
import { WORKBOOK_DAY_NUMBERS } from '@/lib/workbook';

type Scope = { key: string; label: string; campus: Campus | null };

const SCOPES: Scope[] = [
  { key: 'all', label: 'Todas las sedes', campus: null },
  { key: 'merida', label: 'Mérida', campus: 'merida' },
  { key: 'el_vigia', label: 'El Vigía', campus: 'el_vigia' },
];

/**
 * El interruptor maestro del camp: abre y cierra cada dia.
 *
 * - Actualizacion optimista: el boton cambia al instante, sin esperar a la red.
 * - Realtime: la pantalla de CADA docente se desbloquea sola en el momento,
 *   sin que nadie tenga que refrescar (ver LabRealtime).
 * - Si la escritura falla, se revierte y se muestra el error.
 */
export function DayAccessControl({ rows }: { rows: DayAccessRow[] }) {
  const router = useRouter();
  const [scope, setScope] = useState<Scope>(SCOPES[0]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);

  // Copia local para pintar el cambio al instante (optimista).
  const [optimistic, setOptimistic] = useState<DayAccessRow[]>(rows);
  useEffect(() => setOptimistic(rows), [rows]);

  const applyOptimistic = (change: { campus: Campus | null; day: number; is_open: boolean }) =>
    setOptimistic((state) => {
      const idx = state.findIndex((r) => r.campus === change.campus && r.day === change.day);
      if (idx === -1) return [...state, { ...emptyRow(change.campus, change.day), is_open: change.is_open }];
      const next = [...state];
      next[idx] = { ...next[idx], is_open: change.is_open };
      return next;
    });

  const isOpen = (campus: Campus | null, day: number) => {
    const own = optimistic.find((r) => r.campus === campus && r.day === day);
    if (own) return own.is_open;
    // Si la sede no tiene regla propia, hereda la global.
    const global = optimistic.find((r) => r.campus === null && r.day === day);
    return global?.is_open ?? false;
  };

  const inherits = (campus: Campus | null, day: number) =>
    campus !== null && !optimistic.some((r) => r.campus === campus && r.day === day);

  async function toggle(day: number, next: boolean) {
    setError(null);
    setBusy(day);
    applyOptimistic({ campus: scope.campus, day, is_open: next });

    // Se llama a la funcion SQL y no a un upsert: day_access usa indices unicos
    // PARCIALES (campus null / campus not null) que Postgres no puede inferir en
    // un ON CONFLICT. La funcion resuelve el insert-o-update en el servidor.
    const { error } = await createClient().rpc('set_day_access', {
      p_campus: scope.campus,
      p_day: day,
      p_open: next,
    });

    if (error) {
      setError(`No se pudo cambiar el Day ${day}: ${error.message}`);
      applyOptimistic({ campus: scope.campus, day, is_open: !next }); // revertir
    }
    setBusy(null);
    router.refresh();
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-plum-500 px-6 py-4 text-white">
        <div className="flex items-center gap-3">
          <Squiggle className="h-5 w-16 shrink-0 text-sun-400" />
          <div>
            <p className="eyebrow text-sun-400">Control del camp</p>
            <h2 className="h-display text-xl">Apertura de días</h2>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 rounded-full bg-white/10 p-1">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setScope(s)}
              aria-pressed={scope.key === s.key}
              className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
                scope.key === s.key ? 'bg-sun-400 text-plum-500' : 'text-white/75 hover:text-white'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 py-5">
        <p className="text-sm leading-relaxed text-ink/65">
          Solo los días abiertos son visibles y editables para los docentes. El cambio llega a sus
          pantallas al instante, sin que refresquen.
        </p>

        {error && (
          <p role="alert" className="mt-4 rounded-2xl bg-coral-50 px-4 py-2.5 text-sm font-semibold text-coral-700">
            {error}
          </p>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {WORKBOOK_DAY_NUMBERS.map((day) => {
            const open = isOpen(scope.campus, day);
            const inherited = inherits(scope.campus, day);
            return (
              <div
                key={day}
                className={`rounded-3xl border-2 p-4 transition ${
                  open ? 'border-moss-500/30 bg-moss-50' : 'border-teal-100 bg-white'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="eyebrow text-teal-600">Day {day}</p>
                    <p className="h-display mt-1 text-base text-teal-900">Reading Lab</p>
                  </div>
                  <span
                    className={`chip ${open ? 'bg-moss-500 text-white' : 'bg-plum-50 text-plum-400'}`}
                  >
                    {open ? <UnlockIcon className="h-3 w-3" /> : <LockIcon className="h-3 w-3" />}
                    {open ? 'Abierto' : 'Cerrado'}
                  </span>
                </div>

                {inherited && (
                  <p className="mt-2 text-[11px] font-semibold text-ink/45">
                    Heredado de la regla global
                  </p>
                )}

                <button
                  type="button"
                  disabled={busy === day}
                  onClick={() => toggle(day, !open)}
                  className={`mt-4 w-full ${open ? 'btn-ghost' : 'btn-primary'} btn-sm py-2`}
                >
                  {busy === day ? '…' : open ? 'Cerrar día' : 'Abrir día'}
                </button>
              </div>
            );
          })}
        </div>

        <p className="mt-5 text-xs font-semibold text-ink/45">
          Consejo: abre el día justo al empezar la sesión y ciérralo al terminar. Si un docente
          necesita ponerse al día, ábrele el día desde su ficha individual.
        </p>
      </div>
    </section>
  );
}

function emptyRow(campus: Campus | null, day: number): DayAccessRow {
  return {
    id: `optimistic-${campus ?? 'all'}-${day}`,
    campus,
    day,
    is_open: false,
    opened_by: null,
    opened_at: null,
    updated_at: new Date().toISOString(),
  };
}
