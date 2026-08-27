'use client';

import { useRealtime } from '@/lib/useRealtime';

/**
 * Keeps moderator screens current without forcing a full refresh for every
 * participant keystroke/autosave.
 *
 * Dashboard: checkpoint/access/report events only.
 * Participant detail: also watches that participant's responses, heavily
 * debounced so typing never causes continuous page reloads.
 */
export function ModeratorRealtime({ userId }: { userId?: string }) {
  const filter = userId ? `user_id=eq.${userId}` : undefined;

  useRealtime({
    channel: `moa-mod-${userId ?? 'all'}`,
    debounce: userId ? 3500 : 1600,
    tables: [
      ...(userId ? [{ table: 'responses', filter } as const] : []),
      { table: 'checkpoints', filter },
      { table: 'ai_reports', filter },
      { table: 'day_access' },
      ...(userId ? [{ table: 'participant_day_access', filter } as const] : []),
    ],
  });

  return null;
}
