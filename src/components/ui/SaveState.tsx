'use client';

import { cn } from '@/lib/utils';

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'locked';

const MAP: Record<Exclude<SaveStatus, 'idle'>, [string, string]> = {
  saving: ['Saving…', 'bg-teal-50 text-teal-600'],
  saved: ['Saved', 'bg-moss-100 text-moss-600'],
  error: ['Could not save', 'bg-coral-100 text-coral-700'],
  locked: ['Day locked', 'bg-plum-50 text-plum-400'],
};

export function SaveState({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null;
  const [text, tone] = MAP[status];
  return (
    <span
      aria-live="polite"
      className={cn('chip shrink-0 animate-pop-in whitespace-nowrap', tone)}
    >
      {status === 'saved' && <span aria-hidden="true">✓</span>}
      {text}
    </span>
  );
}
