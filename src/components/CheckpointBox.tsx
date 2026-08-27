import { Badge } from '@/components/ui/Badge';
import { CheckpointSubmitButton } from '@/components/CheckpointSubmitButton';
import type { Checkpoint } from '@/lib/workbook';
import type { CheckpointRow } from '@/types/database';

export function CheckpointBox({
  checkpoint,
  row,
  day,
}: {
  checkpoint: Checkpoint;
  row?: CheckpointRow;
  day: number;
  sectionId: string;
}) {
  const status = row?.status ?? 'pending';
  const submitted = Boolean(row?.submitted_at);

  return (
    <div
      id={`checkpoint-${checkpoint.number}`}
      className={`scroll-mt-28 rounded-3xl border-2 border-dashed p-5 transition ${
        status === 'approved'
          ? 'border-moss-500/40 bg-moss-50'
          : status === 'needs_work'
            ? 'border-coral-200 bg-coral-50'
            : submitted
              ? 'border-sun-400/60 bg-sun-50'
              : 'border-teal-200 bg-white/70'
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="h-display text-sm text-teal-800">CHECKPOINT {checkpoint.number} — el moderador revisa:</p>
        {status === 'approved' && <Badge tone="success">Aprobado</Badge>}
        {status === 'needs_work' && <Badge tone="danger">Por mejorar</Badge>}
        {status === 'pending' && submitted && <Badge tone="warn">En revisión</Badge>}
        {status === 'pending' && !submitted && <Badge tone="neutral">Listo para enviar</Badge>}
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

      {submitted && row?.submitted_at && status === 'pending' && (
        <p className="mt-4 text-xs font-semibold text-ink/55">
          Enviado a revisión · {new Date(row.submitted_at).toLocaleString('es-VE')}
        </p>
      )}

      {row?.moderator_initials && (
        <p className="mt-4 text-xs font-semibold text-ink/55">
          Iniciales: <strong className="text-teal-800">{row.moderator_initials}</strong>
          {row.approved_at && ` · ${new Date(row.approved_at).toLocaleString('es-VE')}`}
        </p>
      )}
      {row?.comments && <p className="mt-1.5 text-xs italic leading-relaxed text-ink/70">“{row.comments}”</p>}

      {status !== 'approved' && (!submitted || status === 'needs_work') && (
        <CheckpointSubmitButton day={day} checkpointNumber={checkpoint.number} resubmit={status === 'needs_work'} />
      )}
    </div>
  );
}
