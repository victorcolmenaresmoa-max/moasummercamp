'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
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

  async function save(status: CheckpointStatus) {
    setSaving(status);
    const supabase = createClient();
    await supabase.from('checkpoints').upsert(
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
    setSaving(null);
    router.refresh();
  }

  const toggle = (i: string) =>
    setItems((prev) => (prev.includes(i) ? prev.filter((x) => x !== i) : [...prev, i]));

  const statusChip =
    row?.status === 'approved'
      ? 'bg-moss-100 text-moss-500'
      : row?.status === 'needs_work'
      ? 'bg-clay-100 text-clay-500'
      : 'bg-amber-100 text-amber-800';

  return (
    <div className="rounded-2xl border-2 border-dashed border-brand-200 bg-brand-50/50 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-brand-800">CHECKPOINT {checkpoint.number}</p>
        <span className={`chip ${statusChip}`}>
          {row?.status === 'approved' ? 'Aprobado' : row?.status === 'needs_work' ? 'Por mejorar' : 'Pendiente'}
        </span>
      </div>

      <div className="mt-3 space-y-1">
        {checkpoint.items.map((i) => (
          <label key={i} className="flex cursor-pointer items-start gap-2 text-sm text-ink/80">
            <input type="checkbox" className="mt-1" checked={items.includes(i)} onChange={() => toggle(i)} />
            {i}
          </label>
        ))}
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-[120px_1fr]">
        <input
          className="input"
          placeholder="Iniciales"
          value={initials}
          onChange={(e) => setInitials(e.target.value.toUpperCase())}
          maxLength={6}
        />
        <input
          className="input"
          placeholder="Comentario para el docente (opcional)"
          value={comments}
          onChange={(e) => setComments(e.target.value)}
        />
      </div>

      <div className="mt-3 flex gap-2">
        <button className="btn-primary py-1.5" disabled={!!saving} onClick={() => save('approved')}>
          {saving === 'approved' ? 'Guardando…' : 'Aprobar'}
        </button>
        <button className="btn-ghost py-1.5" disabled={!!saving} onClick={() => save('needs_work')}>
          Por mejorar
        </button>
      </div>
    </div>
  );
}
