'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { CheckIcon } from '@/components/ui/Icons';
import type { Checkpoint } from '@/lib/workbook';
import type { CheckpointRow, CheckpointStatus } from '@/types/database';

type Props = {
  participantId: string;
  moderatorId: string;
  day: number;
  checkpoint: Checkpoint;
  row?: CheckpointRow;
};

export function CheckpointApproval({ participantId, moderatorId, day, checkpoint, row }: Props) {
  const router = useRouter();
  const [items, setItems] = useState<string[]>(row?.items_checked ?? []);
  const [initials, setInitials] = useState(row?.moderator_initials ?? '');
  const [comments, setComments] = useState(row?.comments ?? '');
  const [saving, setSaving] = useState<CheckpointStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function save(status: CheckpointStatus) {
    setSaving(status);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.from('checkpoints').upsert(
      {
        user_id: participantId,
        day,
        checkpoint_number: checkpoint.number,
        status,
        items_checked: items,
        moderator_id: moderatorId,
        moderator_initials: initials || null,
        comments: comments || null,
        approved_at: status === 'approved' ? new Date().toISOString() : null,
      },
      { onConflict: 'user_id,day,checkpoint_number' },
    );
    if (error) setError(error.message);
    setSaving(null);
    router.refresh();
  }

  const toggle = (i: string) =>
    setItems((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const chip =
    row?.status === 'approved'
      ? 'bg-moss-500 text-white'
      : row?.status === 'needs_work'
        ? 'bg-coral-500 text-white'
        : 'bg-sun-400 text-plum-500';

  return (
    <div id={`checkpoint-${checkpoint.number}`} className="scroll-mt-28 rounded-3xl border-2 border-dashed border-teal-200 bg-teal-50/50 p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="h-display text-sm text-teal-800">CHECKPOINT {checkpoint.number}</p>
        <span className={`chip ${chip}`}>
          {row?.status === 'approved' ? 'Aprobado' : row?.status === 'needs_work' ? 'Por mejorar' : row?.submitted_at ? 'En revisión' : 'Pendiente'}
        </span>
      </div>

      {row?.submitted_at && (
        <p className="mt-3 text-xs font-semibold text-teal-700">
          Enviado por el participante: {new Date(row.submitted_at).toLocaleString('es-VE')}
          {row.submission_count > 1 ? ` · envío #${row.submission_count}` : ''}
        </p>
      )}

      <div className="mt-3.5 space-y-2">
        {checkpoint.items.map((i) => (
          <label key={i} className="flex cursor-pointer items-start gap-2.5 text-sm text-ink/80">
            <input
              type="checkbox"
              className="mt-0.5 h-4 w-4 shrink-0 accent-teal-500"
              checked={items.includes(i)}
              onChange={() => toggle(i)}
            />
            {i}
          </label>
        ))}
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-[130px_1fr]">
        <input
          className="input"
          placeholder="Iniciales"
          aria-label="Iniciales del moderador"
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <input
          className="input"
          placeholder="Comentario para el docente (opcional)"
          aria-label="Comentario"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      {error && <p className="mt-2 text-xs font-bold text-coral-600">{error}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-primary btn-sm py-2" disabled={!!saving} onClick={() => save('approved')}>
          <CheckIcon className="h-3.5 w-3.5" />
          {saving === 'approved' ? 'Guardando…' : 'Aprobar'}
        </button>
        <button className="btn-ghost btn-sm py-2" disabled={!!saving} onClick={() => save('needs_work')}>
          {saving === 'needs_work' ? 'Guardando…' : 'Por mejorar'}
        </button>
      </div>
    </div>
  );
}
