'use client';

import { useRealtime } from '@/lib/useRealtime';

/**
 * Mantiene viva la pantalla del docente sin refrescar:
 *  - day_access / participant_day_access -> el candado se abre en el momento
 *    en que el moderador activa el dia.
 *  - checkpoints -> ve la firma del moderador aparecer en vivo.
 */
export function LabRealtime({ userId }: { userId: string }) {
  useRealtime({
    channel: `moa-lab-${userId}`,
    debounce: 300,
    tables: [
      { table: 'day_access' },
      { table: 'participant_day_access', filter: `user_id=eq.${userId}` },
      { table: 'checkpoints', filter: `user_id=eq.${userId}` },
    ],
  });
  return null;
}
