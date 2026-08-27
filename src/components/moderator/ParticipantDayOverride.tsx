'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LockIcon, UnlockIcon } from '@/components/ui/Icons';
import { WORKBOOK_DAY_NUMBERS } from '@/lib/workbook';
import type { ParticipantDayAccessRow } from '@/types/database';

/**
 * Excepcion individual: para el docente que falto a una sesion y necesita
 * recuperar, o para cerrarle un dia concreto. Manda por encima de la regla
 * global y de la de su sede.
 */
export function ParticipantDayOverride({
  participantId,
  moderatorId,
  overrides,
  effectiveOpen,
}: {
  participantId: string;
  moderatorId: string;
  overrides: ParticipantDayAccessRow[];
  /** Que dias ve abiertos hoy este docente segun las reglas generales. */
  effectiveOpen: Record<number, boolean>;
}) {
  const router = useRouter();
  const [local, setLocal] = useState(overrides);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => setLocal(overrides), [overrides]);

  const overrideFor = (day: number) => local.find((o) => o.day === day);
  const isOpen = (day: number) => overrideFor(day)?.is_open ?? effectiveOpen[day] ?? false;

  async function setOverride(day: number, next: boolean | null) {
    setBusy(day);
    setError(null);
    const supabase = createClient();

    if (next === null) {
      // Quitar la excepcion: vuelve a mandar la regla general.
      setLocal((l) => l.filter((o) => o.day !== day));
      const { error } = await supabase
        .from('participant_day_access')
        .delete()
        .eq('user_id', participantId)
        .eq('day', day);
      if (error) setError(error.message);
    } else {
      setLocal((l) => [
        ...l.filter((o) => o.day !== day),
        { user_id: participantId, day, is_open: next, granted_by: moderatorId, updated_at: new Date().toISOString() },
      ]);
      const { error } = await supabase
        .from('participant_day_access')
        .upsert(
          { user_id: participantId, day, is_open: next, granted_by: moderatorId },
          { onConflict: 'user_id,day' },
        );
      if (error) setError(error.message);
    }

    setBusy(null);
    router.refresh();
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="h-display text-lg text-teal-900">Acceso a los días de este docente</h2>
        <span className="text-xs font-semibold text-ink/45">
          Las excepciones mandan sobre la regla general
        </span>
      </div>

      {error && (
        <p role="alert" className="mt-3 rounded-2xl bg-coral-50 px-4 py-2 text-sm font-semibold text-coral-700">
          {error}
        </p>
      )}

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {WORKBOOK_DAY_NUMBERS.map((day) => {
          const ov = overrideFor(day);
          const open = isOpen(day);
          return (
            <div
              key={day}
              className={`rounded-2xl border-2 p-3 ${open ? 'border-moss-500/30 bg-moss-50' : 'border-teal-100'}`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold text-teal-800">
                  Day {day} · Reading Lab
                </p>
                <span className={open ? 'text-moss-600' : 'text-plum-300'}>
                  {open ? <UnlockIcon className="h-4 w-4" /> : <LockIcon className="h-4 w-4" />}
                </span>
              </div>

              <p className="mt-1 text-[11px] font-semibold text-ink/45">
                {ov ? (ov.is_open ? 'Excepción: abierto' : 'Excepción: cerrado') : 'Sigue la regla general'}
              </p>

              <div className="mt-2.5 flex gap-1.5">
                <button
                  type="button"
                  disabled={busy === day}
                  onClick={() => setOverride(day, !open)}
                  className={`${open ? 'btn-ghost' : 'btn-primary'} btn-sm grow py-1.5`}
                >
                  {busy === day ? '…' : open ? 'Cerrar' : 'Abrir'}
                </button>
                {ov && (
                  <button
                    type="button"
                    disabled={busy === day}
                    onClick={() => setOverride(day, null)}
                    title="Quitar la excepción y volver a la regla general"
                    className="btn-ghost btn-sm py-1.5"
                  >
                    ↺
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
