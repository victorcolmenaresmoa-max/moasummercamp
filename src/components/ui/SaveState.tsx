'use client';

import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export function SaveState({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const map = {
    saving: ['Guardando…', 'text-brand-500'],
    saved: ['Guardado ✓', 'text-moss-500'],
    error: ['Error al guardar', 'text-clay-500'],
  } as const;
  const [text, color] = map[status];
  return <span className={cn('text-xs font-semibold', color)}>{text}</span>;
}
