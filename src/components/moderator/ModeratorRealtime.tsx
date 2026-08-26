'use client';

import { useRealtime } from '@/lib/useRealtime';

/**
 * Panel del moderador en vivo.
 * Un unico canal para todas las tablas y refrescos agrupados: con 25 docentes
 * escribiendo a la vez el panel se actualiza sin parpadear ni saturar la red.
 */
export function ModeratorRealtime({ userId }: { userId?: string }) {
  const filter = userId ? `user_id=eq.${userId}` : undefined;

  useRealtime({
    channel: `moa-mod-${userId ?? 'all'}`,
    debounce: userId ? 400 : 900,
    tables: [
      { table: 'responses', filter },
      { table: 'checkpoints', filter },
      { table: 'ai_reports', filter },
      { table: 'day_access' },
    ],
  });

  return null;
}
