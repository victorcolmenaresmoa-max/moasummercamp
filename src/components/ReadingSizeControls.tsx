'use client';

import { useState } from 'react';

const SIZES = ['text-base', 'text-lg', 'text-xl'] as const;

export function ReadingSizeControls({ targetId }: { targetId: string }) {
  const [size, setSize] = useState(0);

  function apply(next: number) {
    const safe = Math.max(0, Math.min(SIZES.length - 1, next));
    const target = document.getElementById(targetId);
    if (target) {
      target.classList.remove(...SIZES);
      target.classList.add(SIZES[safe]);
    }
    setSize(safe);
  }

  return (
    <div className="flex items-center gap-1 rounded-full bg-teal-50 p-1 no-print">
      <button
        type="button"
        className="rounded-full px-3 py-1 text-xs font-extrabold text-teal-700 transition hover:bg-white disabled:opacity-35"
        disabled={size === 0}
        onClick={() => apply(size - 1)}
        aria-label="Decrease text size"
      >
        A−
      </button>
      <span className="text-[11px] font-extrabold text-teal-500">{size + 1}/3</span>
      <button
        type="button"
        className="rounded-full px-3 py-1 text-xs font-extrabold text-teal-700 transition hover:bg-white disabled:opacity-35"
        disabled={size === SIZES.length - 1}
        onClick={() => apply(size + 1)}
        aria-label="Increase text size"
      >
        A+
      </button>
    </div>
  );
}
