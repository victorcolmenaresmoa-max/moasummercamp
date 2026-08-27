'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { SparkIcon, CheckIcon } from '@/components/ui/Icons';
import { Quote } from '@/components/brand/Moa';
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
export function AiPromptCard({ field, day, sectionId, userId }: Props) {
  const [open, setOpen] = useState(false);
  const [extra, setExtra] = useState('');
  const [answer, setAnswer] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function run() {
    setLoading(true);
    setAnswer(null);
    setFailed(false);
    try {
      const res = await fetch('/api/ai/assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day, sectionId, prompt: field.prompt, extra }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.text) {
        setFailed(true);
        setAnswer(json?.error ?? 'The assistant is not available right now.');
      } else {
        // Mostramos la respuesta en cuanto llega. El registro para el
        // moderador se guarda despues y no agrega otra espera a la IA.
        setAnswer(json.text);
        void createClient()
          .from('ai_interactions')
          .insert({
            user_id: userId,
            day,
            section_id: sectionId,
            prompt: extra ? `${field.prompt}
[contexto] ${extra}` : field.prompt,
            response: json.text,
          })
          .then(({ error }) => {
            if (error) console.error('[ai-interaction-log]', error.message);
          });
      }
    } catch {
      setFailed(true);
      setAnswer('Connection error with the assistant.');
    } finally {
      setLoading(false);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(field.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* el portapapeles puede estar bloqueado: no rompemos nada */
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-plum-100 bg-plum-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-2 text-plum-500">
          <SparkIcon className="h-4 w-4" />
          AI prompt
        </p>
        <span className="text-[11px] font-extrabold text-plum-300">
          Read first. Think second. Ask AI third.
        </span>
      </div>

      <blockquote className="relative mt-3 rounded-2xl bg-white p-4 pl-11 text-sm italic leading-relaxed text-ink/85">
        <Quote className="absolute left-3.5 top-4 h-4 w-5 text-sun-400" />
        {field.prompt}
      </blockquote>

      {field.note && <p className="mt-2.5 text-xs font-semibold leading-relaxed text-plum-400">{field.note}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="btn-ghost btn-sm" onClick={copy}>
          {copied ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            'Copy prompt'
          )}
        </button>
        <button
          type="button"
          className="btn-sm btn bg-plum-500 text-white hover:bg-plum-600"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
        >
          {open ? 'Close assistant' : 'Use assistant here'}
        </button>
      </div>

      {open && (
        <div className="mt-4 space-y-3 rounded-2xl border-2 border-plum-100 bg-white p-4 animate-fade-up">
          <label className="label text-xs" htmlFor={`${field.key}-extra`}>
            Add your context (words, ideas, your draft…)
          </label>
          <textarea
            id={`${field.key}-extra`}
            className="input"
            rows={3}
            value={extra}
            placeholder="E.g.: disappointed, overnight, growth mindset…"
            onChange={(e) => setExtra(e.target.value)}
          />

          <button type="button" className="btn-accent btn-sm" disabled={loading} onClick={run}>
            <SparkIcon className="h-3.5 w-3.5" />
            {loading ? 'Thinking…' : 'Send'}
          </button>

          {loading && <div className="skeleton h-20 w-full" />}

          {answer && !loading && (
            <div
              className={`whitespace-pre-wrap rounded-2xl p-4 text-sm leading-relaxed ${
                failed ? 'bg-coral-50 font-semibold text-coral-700' : 'bg-teal-50 text-ink/85'
              }`}
            >
              {answer}
            </div>
          )}

          <p className="text-[11px] font-semibold text-ink/45">
            This request is logged for your moderator. AI does not write your workbook answers for you.
          </p>
        </div>
      )}
    </div>
  );
}
