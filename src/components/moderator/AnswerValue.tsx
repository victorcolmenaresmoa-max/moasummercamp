import { hasContent } from '@/lib/utils';

/** Renderiza el jsonb guardado en cualquiera de sus formas. */
export function AnswerValue({ value }: { value: any }) {
  if (!hasContent(value)) {
    return <p className="text-sm font-semibold italic text-ink/30">No response</p>;
  }

  if (typeof value?.text === 'string') {
    return <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink/85">{value.text}</p>;
  }

  if (Array.isArray(value?.checked)) {
    return (
      <div className="flex flex-wrap gap-2">
        {value.checked.map((c: string) => (
          <span key={c} className="chip bg-moss-100 text-moss-600">
            {c}
          </span>
        ))}
      </div>
    );
  }

  if (Array.isArray(value?.rows)) {
    const rows = value.rows.filter((r: string[]) => r.some((c) => (c ?? '').trim()));
    return (
      <div className="overflow-x-auto rounded-2xl border-2 border-teal-50">
        <table className="w-full text-sm">
          <tbody>
            {rows.map((r: string[], i: number) => (
              <tr key={i} className="border-b border-teal-50 last:border-0">
                {r.map((c, j) => (
                  <td
                    key={j}
                    className={`px-3 py-2 align-top ${j === 0 ? 'font-bold text-teal-800' : 'text-ink/85'}`}
                  >
                    {c || '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <ul className="space-y-1 text-sm text-ink/85">
      {Object.entries(value).map(([k, v]) => (
        <li key={k}>
          <strong className="text-teal-800">{k}:</strong> {String(v)}
        </li>
      ))}
    </ul>
  );
}
