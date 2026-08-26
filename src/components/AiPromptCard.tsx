'use client';

import { useState } from 'react';
import type { Field } from '@/lib/workbook';

type Props = {
  field: Extract<Field, { type: 'ai_prompt' }>;
  day: number;
  sectionId: string;
  userId: string;
};

/**
 * Tarjeta del prompt sugerido por el workbook.
 * El participante puede copiarlo (ChatGPT/Claude/Gemini) o ejecutarlo aqui:
 * en ese caso la interaccion queda registrada y el moderador puede verla.
 */
export function AiPromptCard({ field, day, sectionId }: Props) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    setAnswer(null);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, sectionId, prompt: field.prompt, extra }),
      });
      const json = await res.json();
      setAnswer(res.ok ? json.text : `Error: ${json.error ?? 'no disponible'}`);
    } catch {
      setAnswer('Error de conexión con el asistente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold uppercase tracking-wide text-brand-700">AI prompt</p>
        <span className="text-[11px] font-semibold text-brand-500">Read first. Think second. Ask AI third.</span>
      </div>

      <p className="mt-2 rounded-xl bg-white p-3 font-serif text-sm italic text-ink/85">“{field.prompt}”</p>
      {field.note && <p className="mt-2 text-xs text-ink/70">{field.note}</p>}

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className="btn-ghost"
          onClick={async () => {
            await navigator.clipboard.writeText(field.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
        >
          {copied ? 'Copiado ✓' : 'Copiar prompt'}
        </button>
        <button type="button" className="btn-primary" onClick={() => setOpen((o) => !o)}>
          {open ? 'Cerrar asistente' : 'Usar asistente aquí'}
        </button>
      </div>

      {open && (
        <div className="mt-3 space-y-2 rounded-xl border border-brand-100 bg-white p-3">
          <label className="label text-xs">Añade tu contexto (palabras, ideas, tu borrador…)</label>
          <textarea
            className="input"
            rows={3}
            value={extra}
            placeholder="Ej.: disappointed, overnight, growth mindset…"
            onChange={(e) => setExtra(e.target.value)}
          />
          <button type="button" className="btn-accent" disabled={loading} onClick={run}>
            {loading ? 'Pensando…' : 'Enviar'}
          </button>
          {answer && (
            <div className="whitespace-pre-wrap rounded-xl bg-brand-50 p-3 text-sm leading-relaxed">{answer}</div>
          )}
          <p className="text-[11px] text-ink/50">
            Esta consulta queda registrada para tu moderador. La IA no escribe tus respuestas por ti.
          </p>
        </div>
      )}
    </div>
  );
}
