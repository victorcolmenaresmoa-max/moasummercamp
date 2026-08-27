'use client';

import { useState } from 'react';
import { Quote, Squiggle } from '@/components/brand/Moa';
import type { ReadingBlock } from '@/lib/workbook';

const SIZES = ['text-base', 'text-lg', 'text-xl'] as const;

export function ReadingText({ title, blocks }: { title: string; blocks: ReadingBlock[] }) {
  const [size, setSize] = useState(0);

  return (
    <article className="card overflow-hidden">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-teal-50 px-6 py-5 sm:px-7">
        <div className="flex items-start gap-3">
          <Squiggle className="mt-1.5 h-5 w-16 shrink-0 text-coral-500" />
          <div>
            <p className="eyebrow text-coral-500">Reading text</p>
            <h2 className="h-display mt-1 text-2xl text-teal-900">{title}</h2>
          </div>
        </div>

        {/* Control de tamaño: muchos docentes leen desde el móvil. */}
        <div className="flex items-center gap-1 rounded-full bg-teal-50 p-1 no-print">
          <button
            type="button"
            className="rounded-full px-3 py-1 text-xs font-extrabold text-teal-700 transition hover:bg-white disabled:opacity-35"
            disabled={size === 0}
            onClick={() => setSize((s) => Math.max(0, s - 1))}
            aria-label="Decrease text size"
          >
            A−
          </button>
          <span className="text-[11px] font-extrabold text-teal-500">{size + 1}/3</span>
          <button
            type="button"
            className="rounded-full px-3 py-1 text-xs font-extrabold text-teal-700 transition hover:bg-white disabled:opacity-35"
            disabled={size === SIZES.length - 1}
            onClick={() => setSize((s) => Math.min(SIZES.length - 1, s + 1))}
            aria-label="Increase text size"
          >
            A+
          </button>
        </div>
      </div>

      <div className={`reading px-6 py-6 text-ink/90 sm:px-7 ${SIZES[size]}`}>
        {blocks.map((b, i) => {
          if (b.type === 'h') {
            return (
              <h3 key={i} className="eyebrow mb-2.5 mt-7 text-teal-600">
                {b.text}
              </h3>
            );
          }

          if (b.type === 'quote') {
            return (
              <p
                key={i}
                className="relative my-6 rounded-3xl bg-sun-100 px-6 py-5 pl-14 font-bold italic leading-relaxed text-plum-500"
              >
                <Quote className="absolute left-5 top-5 h-5 w-6 text-sun-500" />
                {b.text}
              </p>
            );
          }

          if (b.type === 'table') {
            return (
              <div key={i} className="my-6 overflow-x-auto rounded-3xl border-2 border-teal-100">
                <table className="w-full text-sm">
                  <thead className="bg-teal-50">
                    <tr>
                      {b.head.map((h) => (
                        <th key={h} className="eyebrow px-3.5 py-2.5 text-left text-teal-700">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-teal-50">
                        {r.map((c, ci) => (
                          <td key={ci} className={`px-3.5 py-2.5 ${ci === 0 ? 'font-bold text-teal-800' : ''}`}>
                            {c}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          return <p key={i}>{b.text}</p>;
        })}
      </div>
    </article>
  );
}
