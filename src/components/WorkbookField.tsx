'use client';

import { useMemo } from 'react';
import type { Field } from '@/lib/workbook';
import { useAutosave } from '@/lib/useAutosave';
import { SaveState } from '@/components/ui/SaveState';
import { AiPromptCard } from '@/components/AiPromptCard';

type Props = {
  field: Field;
  userId: string;
  day: number;
  sectionId: string;
  initial: any;
  readOnly?: boolean;
};

export function WorkbookField(props: Props) {
  const { field } = props;

  if (field.type === 'info') {
    return (
      <div className="rounded-2xl border border-accent-400/40 bg-accent-400/10 p-4">
        {field.title && <p className="text-xs font-bold uppercase tracking-wide text-accent-600">{field.title}</p>}
        <p className="mt-1 text-sm leading-relaxed text-ink/85">{field.text}</p>
      </div>
    );
  }

  if (field.type === 'ai_prompt') {
    return <AiPromptCard field={field} day={props.day} sectionId={props.sectionId} userId={props.userId} />;
  }

  return <AnswerField {...props} field={field} />;
}

function AnswerField({ field, userId, day, sectionId, initial, readOnly }: Props) {
  const label = 'label' in field ? field.label : '';
  const { value, setValue, status } = useAutosave({
    userId,
    day,
    sectionId,
    fieldKey: field.key,
    fieldLabel: label ?? field.key,
    initial,
  });

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-4">
        <div>
          {label && <p className="label">{label}</p>}
          {'help' in field && field.help && <p className="mt-0.5 text-xs text-ink/60">{field.help}</p>}
        </div>
        <SaveState status={status} />
      </div>

      {field.type === 'textarea' && (
        <textarea
          className="input resize-y"
          rows={field.rows ?? 4}
          placeholder={field.placeholder ?? 'Write your answer here…'}
          disabled={readOnly}
          value={value?.text ?? ''}
          onChange={(e) => setValue({ text: e.target.value })}
        />
      )}

      {field.type === 'text' && (
        <input
          className="input"
          disabled={readOnly}
          value={value?.text ?? ''}
          onChange={(e) => setValue({ text: e.target.value })}
        />
      )}

      {field.type === 'table' && (
        <TableEditor field={field} value={value} setValue={setValue} readOnly={readOnly} />
      )}

      {field.type === 'matrix' && (
        <MatrixEditor field={field} value={value} setValue={setValue} readOnly={readOnly} />
      )}

      {field.type === 'checkgroup' && (
        <div className="flex flex-wrap gap-3">
          {field.options.map((opt) => {
            const checked: string[] = value?.checked ?? [];
            const on = checked.includes(opt);
            return (
              <label
                key={opt}
                className={`chip cursor-pointer border ${on ? 'border-moss-500 bg-moss-100 text-moss-500' : 'border-brand-100 bg-white text-ink/70'}`}
              >
                <input
                  type="checkbox"
                  className="mr-2"
                  disabled={readOnly}
                  checked={on}
                  onChange={() =>
                    setValue({ checked: on ? checked.filter((c) => c !== opt) : [...checked, opt] })
                  }
                />
                {opt}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ------------------------------- TABLA ---------------------------------- */
function TableEditor({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: Extract<Field, { type: 'table' }>;
  value: any;
  setValue: (v: any) => void;
  readOnly?: boolean;
}) {
  const rows: string[][] = useMemo(() => {
    const stored: string[][] = Array.isArray(value?.rows) ? value.rows : [];
    const n = Math.max(field.minRows, stored.length);
    return Array.from({ length: n }, (_, r) =>
      Array.from({ length: field.columns.length }, (_, c) => {
        if (c === 0 && field.fixedFirstColumn?.length) return field.fixedFirstColumn[r] ?? '';
        return stored[r]?.[c] ?? '';
      }),
    );
  }, [value, field]);

  const update = (r: number, c: number, v: string) => {
    const next = rows.map((row) => [...row]);
    next[r][c] = v;
    setValue({ rows: next });
  };

  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr className="bg-brand-50">
            {field.columns.map((c) => (
              <th key={c} className="border-b border-brand-100 px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-brand-700">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, r) => (
            <tr key={r} className="align-top">
              {row.map((cell, c) => {
                const locked = c === 0 && !!field.fixedFirstColumn?.length;
                return (
                  <td key={c} className="border-b border-brand-50 p-0">
                    {locked ? (
                      <div className="px-3 py-2 text-sm font-semibold text-brand-800">{cell}</div>
                    ) : (
                      <textarea
                        rows={2}
                        disabled={readOnly}
                        className="w-full resize-y border-0 bg-transparent px-3 py-2 text-sm outline-none focus:bg-brand-50/50"
                        value={cell}
                        onChange={(e) => update(r, c, e.target.value)}
                      />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      {!readOnly && !field.fixedFirstColumn?.length && (
        <button
          type="button"
          className="w-full border-t border-brand-50 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50"
          onClick={() => setValue({ rows: [...rows, field.columns.map(() => '')] })}
        >
          + Añadir fila
        </button>
      )}
    </div>
  );
}

/* ------------------------------- MATRIZ --------------------------------- */
function MatrixEditor({
  field,
  value,
  setValue,
  readOnly,
}: {
  field: Extract<Field, { type: 'matrix' }>;
  value: any;
  setValue: (v: any) => void;
  readOnly?: boolean;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-brand-100">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-brand-50">
            <th className="px-3 py-2 text-left text-xs font-bold uppercase text-brand-700">Professional practice</th>
            {field.options.map((o) => (
              <th key={o} className="px-3 py-2 text-center text-xs font-bold uppercase text-brand-700">{o}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {field.rows.map((row) => (
            <tr key={row} className="border-t border-brand-50">
              <td className="px-3 py-2 font-semibold text-brand-800">{row}</td>
              {field.options.map((o) => (
                <td key={o} className="px-3 py-2 text-center">
                  <input
                    type="radio"
                    name={`${field.key}-${row}`}
                    disabled={readOnly}
                    checked={value?.[row] === o}
                    onChange={() => setValue({ ...(value ?? {}), [row]: o })}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
