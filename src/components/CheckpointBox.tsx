import { Badge } from '@/components/ui/Badge';
import type { Checkpoint } from '@/lib/workbook';
import type { CheckpointRow } from '@/types/database';

/** Vista del participante: solo lectura. El moderador es quien firma. */
export function CheckpointBox({ checkpoint, row }: { checkpoint: Checkpoint; row?: CheckpointRow }) {
  const status = row?.status ?? 'pending';
  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-white/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-brand-800">CHECKPOINT {checkpoint.number} — el moderador revisa:</p>
        {status === 'approved' && <Badge tone="success">Aprobado</Badge>}
        {status === 'needs_work' && <Badge tone="danger">Por mejorar</Badge>}
        {status === 'pending' && <Badge tone="warn">Pendiente</Badge>}
      </div>
      <ul className="mt-2 space-y-1 text-sm text-ink/75">
        {checkpoint.items.map((i) => (
          <li key={i} className="flex gap-2">
            <span className={row?.items_checked?.includes(i) ? 'text-moss-500' : 'text-brand-200'}>■</span>
            {i}
          </li>
        ))}
      </ul>
      {row?.moderator_initials && (
        <p className="mt-3 text-xs text-ink/60">
          Iniciales: <strong>{row.moderator_initials}</strong> ·{' '}
          {row.approved_at ? new Date(row.approved_at).toLocaleString('es-VE') : ''}
        </p>
      )}
      {row?.comments && <p className="mt-1 text-xs italic text-ink/70">“{row.comments}”</p>}
    </div>
  );
}
