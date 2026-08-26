import { Badge } from '@/components/ui/Badge';
import type { Checkpoint } from '@/lib/workbook';
import type { CheckpointRow } from '@/types/database';

/** Vista del participante: solo lectura. El moderador es quien firma. */
export function CheckpointBox({ checkpoint, row }: { checkpoint: Checkpoint; row?: CheckpointRow }) {
  const status = row?.status ?? 'pending';

  return (
    <div
      className={`rounded-3xl border-2 border-dashed p-5 transition ${
        status === 'approved'
          ? 'border-moss-500/40 bg-moss-50'
          : status === 'needs_work'
            ? 'border-coral-200 bg-coral-50'
            : 'border-teal-200 bg-white/70'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="h-display text-sm text-teal-800">
          CHECKPOINT {checkpoint.number} — el moderador revisa:
        </p>
        {status === 'approved' && <Badge tone="success">Aprobado</Badge>}
        {status === 'needs_work' && <Badge tone="danger">Por mejorar</Badge>}
        {status === 'pending' && <Badge tone="warn">Pendiente</Badge>}
      </div>

      <ul className="mt-3 space-y-1.5 text-sm text-ink/75">
        {checkpoint.items.map((i) => {
          const done = row?.items_checked?.includes(i);
          return (
            <li key={i} className="flex gap-2.5">
              <span className={done ? 'text-moss-500' : 'text-teal-200'} aria-hidden="true">
                {done ? '✓' : '■'}
              </span>
              {i}
            </li>
          );
        })}
      </ul>

      {row?.moderator_initials && (
        <p className="mt-4 text-xs font-semibold text-ink/55">
          Iniciales: <strong className="text-teal-800">{row.moderator_initials}</strong>
          {row.approved_at && ` · ${new Date(row.approved_at).toLocaleString('es-VE')}`}
        </p>
      )}
      {row?.comments && (
        <p className="mt-1.5 text-xs italic leading-relaxed text-ink/70">“{row.comments}”</p>
      )}
    </div>
  );
}
