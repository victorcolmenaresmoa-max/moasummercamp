'use client';

import { memo, useMemo } from 'react';
import type { Field } from '@/lib/workbook';
import { useAutosave } from '@/lib/useAutosave';
import { SaveState } from '@/components/ui/SaveState';
import { AiPromptCard } from '@/components/AiPromptCard';
import { Burst } from '@/components/brand/Moa';

type Props = {
  field: Field;
  userId: string;
  day: number;
  sectionId: string;
  initial: any;
  readOnly?: boolean;
};

/**
 * memo: en el Dia 3 hay ~25 campos. Sin memo, escribir una letra en uno
 * re-renderiza los otros 24. Cada campo posee su propio estado, asi que
 * memorizarlo es seguro y elimina el retardo al teclear.
 */
export const WorkbookField = memo(function WorkbookField(props: Props) {
  const { field } = props;

  if (field.type === 'info') {
    return (
      <div className="relative overflow-hidden rounded-3xl bg-sun-100 p-5">
        <Burst className="pointer-events-none absolute -right-4 -top-4 h-16 w-16 text-sun-300/60" />
        {field.title && <p className="eyebrow relative text-sun-700">{field.title}</p>}
        <p className="relative mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-plum-500">
          {field.text}
        </p>
      </div>
    );
  }

  if (field.type === 'ai_prompt') {
    return <AiPromptCard field={field} day={props.day} sectionId={props.sectionId} userId={props.userId} />;
  }

  return <AnswerField {...props} field={field} />;
});

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

  const disabled = readOnly || status === 'locked';

  return (
    <div className="space-y-2.5">
      <div className="flex items-start justify-between gap-4">
        <div>
          {label && (
            <label className="label" htmlFor={field.key}>
              {label}
            </label>
          )}
          {'help' in field && field.help && (
            <p className="mt-1 text-xs font-semibold text-ink/55">{field.help}</p>
          )}
        </div>
        <SaveState status={status} />
      </div>

      {field.type === 'textarea' && (
        <textarea
          id={field.key}
          className="input resize-y leading-relaxed"
          rows={field.rows ?? 4}
          placeholder={field.placeholder ?? 'Write your answer here…'}
          disabled={disabled}
          value={value?.text ?? ''}
          onChange={(e) => setValue({ text: e.target.value })}
        />
      )}

      {field.type === 'text' && (
        <input
          id={field.key}
          className="input"
          placeholder={field.placeholder}
          disabled={disabled}
          value={value?.text ?? ''}
          onChange={(e) => setValue({ text: e.target.value })}
        />
      )}

      {field.type === 'table' && (
        <TableEditor field={field} value={value} setValue={setValue} readOnly={disabled} />
      )}

      {field.type === 'matrix' && (
        <MatrixEditor field={field} value={value} setValue={setValue} readOnly={disabled} />
      )}

      {field.type === 'checkgroup' && (
        <div className="flex flex-wrap gap-2.5">
          {field.options.map((opt) => {
            const checked: string[] = value?.checked ?? [];
            const on = checked.includes(opt);
            return (
              <label
                key={opt}
                className={`chip cursor-pointer border-2 transition ${
                  on
                    ? 'border-teal-500 bg-teal-500 text-white'
                    : 'border-teal-100 bg-white text-ink/70 hover:border-teal-200'
                } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  disabled={disabled}
                  checked={on}
                  onChange={() => setValue({ checked: on ? checked.filter((c) => c !== opt) : [...checked, opt] })}
                />
                <span aria-hidden="true">{on ? '✓' : '+'}</span>
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
    <div className="overflow-hidden rounded-3xl border-2 border-teal-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr className="bg-teal-50">
              {field.columns.map((c) => (
                <th key={c} className="eyebrow border-b-2 border-teal-100 px-3.5 py-2.5 text-left text-teal-700">
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
                    <td key={c} className="border-b border-teal-50 p-0 last:border-r-0">
                      {locked ? (
                        <div className="bg-teal-50/40 px-3.5 py-2.5 text-sm font-bold text-teal-800">{cell}</div>
                      ) : (
                        <textarea
                          rows={2}
                          disabled={readOnly}
                          aria-label={`${field.columns[c]} fila ${r + 1}`}
                          className="w-full resize-y border-0 bg-transparent px-3.5 py-2.5 text-sm outline-none transition focus:bg-teal-50/60 disabled:cursor-not-allowed"
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
      </div>

      {!readOnly && !field.fixedFirstColumn?.length && (
        <button
          type="button"
          className="w-full border-t-2 border-teal-50 bg-white py-2.5 text-xs font-extrabold text-teal-600 transition hover:bg-teal-50"
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
    <div className="overflow-x-auto rounded-3xl border-2 border-teal-100">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="bg-teal-50">
            <th className="eyebrow px-3.5 py-2.5 text-left text-teal-700">Professional practice</th>
            {field.options.map((o) => (
              <th key={o} className="eyebrow px-3 py-2.5 text-center text-teal-700">
                {o}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {field.rows.map((row) => (
            <tr key={row} className="border-t border-teal-50">
              <td className="px-3.5 py-2.5 font-bold text-teal-800">{row}</td>
              {field.options.map((o) => (
                <td key={o} className="px-3 py-2.5 text-center">
                  <input
                    type="radio"
                    className="h-4 w-4 accent-teal-500"
                    name={`${field.key}-${row}`}
                    aria-label={`${row}: ${o}`}
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
