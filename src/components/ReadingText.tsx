'use client';

import { useState } from 'react';
import type { ReadingBlock } from '@/lib/workbook';

export function ReadingText({ title, blocks }: { title: string; blocks: ReadingBlock[] }) {
  const [big, setBig] = useState(false);

  return (
    <article className="card p-6">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-accent-600">Reading text</p>
          <h2 className="font-serif text-2xl font-bold text-brand-900">{title}</h2>
        </div>
        <button type="button" className="btn-ghost no-print" onClick={() => setBig((b) => !b)}>
          {big ? 'A-' : 'A+'}
        </button>
      </div>

      <div className={`reading font-serif text-ink/90 ${big ? 'text-lg' : 'text-base'}`}>
        {blocks.map((b, i) => {
          if (b.type === 'h') return <h3 key={i} className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-brand-700">{b.text}</h3>;
          if (b.type === 'quote')
            return (
              <p key={i} className="my-4 border-l-4 border-accent-400 bg-accent-400/10 px-4 py-3 font-semibold italic">
                {b.text}
              </p>
            );
          if (b.type === 'table')
            return (
              <div key={i} className="my-4 overflow-x-auto rounded-xl border border-brand-100">
                <table className="w-full text-sm">
                  <thead className="bg-brand-50">
                    <tr>{b.head.map((h) => <th key={h} className="px-3 py-2 text-left font-bold text-brand-700">{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {b.rows.map((r, ri) => (
                      <tr key={ri} className="border-t border-brand-50">
                        {r.map((c, ci) => <td key={ci} className="px-3 py-2">{c}</td>)}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          return <p key={i}>{b.text}</p>;
        })}
      </div>
    </article>
  );
}
