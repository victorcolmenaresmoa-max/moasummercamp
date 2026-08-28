'use client';

import { useEffect, useRef, useState } from 'react';
import { SparkIcon, CheckIcon } from '@/components/ui/Icons';
import { Quote } from '@/components/brand/Moa';
import type { Field } from '@/lib/workbook';
import type { ExternalAiEvidence } from '@/lib/ai/evidence';

type Props = {
  field: Extract<Field, { type: 'ai_prompt' }>;
  day: number;
  sectionId: string;
};

type SavedEvidence = {
  id: string;
  day: number | null;
  section_id: string | null;
  prompt: string;
  response: string | null;
  created_at: string;
  parsed: ExternalAiEvidence | null;
  imageUrl: string | null;
};

const PROVIDERS = ['Google Gemini', 'ChatGPT', 'Claude', 'Other AI'];
const GEMINI_URL = 'https://gemini.google.com/app';

async function compressScreenshot(file: File): Promise<File> {
  const allowed = new Set(['image/png', 'image/jpeg', 'image/webp']);
  if (!allowed.has(file.type)) throw new Error('Please upload a PNG, JPG, or WebP image.');

  const sourceUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('The screenshot could not be opened.'));
      img.src = sourceUrl;
    });

    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('The screenshot could not be prepared.');

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(image, 0, 0, width, height);

    const toBlob = (quality: number) =>
      new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (blob) => (blob ? resolve(blob) : reject(new Error('The screenshot could not be compressed.'))),
          'image/jpeg',
          quality,
        ),
      );

    let blob = await toBlob(0.82);
    if (blob.size > 1_800_000) blob = await toBlob(0.66);
    if (blob.size > 3_300_000) throw new Error('The screenshot is still too large. Please crop it and try again.');

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'ai-evidence';
    return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

/**
 * The workbook keeps the pedagogical prompt but sends participants to their
 * own AI account. Each prompt actually used can then be documented with the
 * AI response as text, a screenshot, or both.
 */
export function AiPromptCard({ field, day, sectionId }: Props) {
  const [promptUsed, setPromptUsed] = useState(field.prompt);
  const [responseText, setResponseText] = useState('');
  const [provider, setProvider] = useState('Google Gemini');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [saved, setSaved] = useState<SavedEvidence[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [saving, setSaving] = useState(false);
  const [imageBusy, setImageBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const promptInputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({ day: String(day), sectionId, fieldKey: field.key });
    fetch(`/api/ai/evidence?${params.toString()}`, { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok) throw new Error(json?.error ?? 'Could not load saved AI evidence.');
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        const rows = Array.isArray(json?.evidence) ? (json.evidence as SavedEvidence[]) : [];
        setSaved(rows);
        if (rows.length > 0) setPromptUsed((current) => (current === field.prompt ? '' : current));
      })
      .catch((error) => {
        if (!cancelled) setMessage({ tone: 'error', text: error?.message ?? 'Could not load saved AI evidence.' });
      })
      .finally(() => {
        if (!cancelled) setLoadingHistory(false);
      });

    return () => {
      cancelled = true;
    };
  }, [day, sectionId, field.key, field.prompt]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function copy(text: string, id: string) {
    if (!text.trim()) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied((current) => (current === id ? null : current)), 1600);
    } catch {
      setMessage({ tone: 'error', text: 'Clipboard access is blocked in this browser.' });
    }
  }

  function clearImage() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setImageFile(null);
  }

  async function chooseImage(file: File | null) {
    if (!file) return;
    setImageBusy(true);
    setMessage(null);
    try {
      const compressed = await compressScreenshot(file);
      clearImage();
      setImageFile(compressed);
      setPreviewUrl(URL.createObjectURL(compressed));
    } catch (error: any) {
      setMessage({ tone: 'error', text: error?.message ?? 'Could not prepare the screenshot.' });
    } finally {
      setImageBusy(false);
    }
  }

  function startAnotherPrompt() {
    setPromptUsed('');
    setResponseText('');
    setProvider('Google Gemini');
    clearImage();
    setMessage(null);
    requestAnimationFrame(() => promptInputRef.current?.focus());
  }

  async function saveEvidence() {
    const prompt = promptUsed.trim();
    const answer = responseText.trim();
    if (!prompt) {
      setMessage({ tone: 'error', text: 'Write the exact prompt you used with the AI.' });
      promptInputRef.current?.focus();
      return;
    }
    if (!answer && !imageFile) {
      setMessage({ tone: 'error', text: 'Paste the AI response, upload a screenshot, or include both.' });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const form = new FormData();
      form.set('day', String(day));
      form.set('sectionId', sectionId);
      form.set('fieldKey', field.key);
      form.set('prompt', prompt);
      form.set('responseText', answer);
      form.set('provider', provider);
      if (imageFile) form.set('image', imageFile);

      const res = await fetch('/api/ai/evidence', { method: 'POST', body: form });
      const json = await res.json().catch(() => null);
      if (!res.ok || !json?.evidence) throw new Error(json?.error ?? 'Could not save AI evidence.');

      setSaved((current) => [...current, json.evidence as SavedEvidence]);
      setResponseText('');
      setPromptUsed('');
      clearImage();
      setMessage({ tone: 'ok', text: 'AI evidence saved. You can add another prompt if you used one.' });
    } catch (error: any) {
      setMessage({ tone: 'error', text: error?.message ?? 'Could not save AI evidence.' });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-plum-100 bg-plum-50/60 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="eyebrow flex items-center gap-2 text-plum-500">
          <SparkIcon className="h-4 w-4" />
          AI prompt
        </p>
        <span className="text-[11px] font-extrabold text-plum-300">Read first. Think second. Ask AI third.</span>
      </div>

      <blockquote className="relative mt-3 rounded-2xl bg-white p-4 pl-11 text-sm italic leading-relaxed text-ink/85">
        <Quote className="absolute left-3.5 top-4 h-4 w-5 text-sun-400" />
        {field.prompt}
      </blockquote>

      {field.note && <p className="mt-2.5 text-xs font-semibold leading-relaxed text-plum-400">{field.note}</p>}

      <div className="mt-4 flex flex-wrap gap-2 no-print" data-allow-copy="true">
        <button type="button" className="btn-ghost btn-sm" onClick={() => copy(field.prompt, 'official')}>
          {copied === 'official' ? (
            <>
              <CheckIcon className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            'Copy prompt'
          )}
        </button>
        <a
          href={GEMINI_URL}
          target="_blank"
          rel="noreferrer"
          data-lab-allow-exit="true"
          className="btn btn-sm bg-plum-500 text-white hover:bg-plum-600"
        >
          Open Google Gemini ↗
        </a>
      </div>

      <div className="mt-5 rounded-2xl border-2 border-plum-100 bg-white p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="eyebrow text-teal-600">AI use evidence</p>
            <p className="mt-1 text-sm font-bold text-teal-900">
              Record every prompt you actually used and what the AI returned.
            </p>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-ink/50">
              You may paste the response, upload a screenshot, or provide both.
            </p>
          </div>
          {saved.length > 0 && (
            <span className="chip bg-teal-50 text-teal-700">{saved.length} saved</span>
          )}
        </div>

        <div className="mt-4 grid gap-4 sm:grid-cols-[170px_1fr]">
          <div>
            <label className="label text-xs" htmlFor={`${field.key}-provider`}>
              AI tool used
            </label>
            <select
              id={`${field.key}-provider`}
              className="input mt-1.5"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
            >
              {PROVIDERS.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between gap-3">
              <label className="label text-xs" htmlFor={`${field.key}-prompt-used`}>
                Exact prompt used
              </label>
              <button
                type="button"
                className="text-[11px] font-extrabold text-teal-600 hover:text-teal-800 disabled:opacity-40"
                disabled={!promptUsed.trim()}
                data-allow-copy="true"
                onClick={() => copy(promptUsed, 'used')}
              >
                {copied === 'used' ? 'Copied' : 'Copy this prompt'}
              </button>
            </div>
            <textarea
              ref={promptInputRef}
              id={`${field.key}-prompt-used`}
              className="input mt-1.5 resize-y leading-relaxed"
              rows={3}
              value={promptUsed}
              placeholder="Paste or write the exact prompt you used."
              onChange={(e) => setPromptUsed(e.target.value)}
            />
          </div>
        </div>

        <label className="label mt-4 text-xs" htmlFor={`${field.key}-response`}>
          AI response as text <span className="font-semibold text-ink/40">(optional if you upload a screenshot)</span>
        </label>
        <textarea
          id={`${field.key}-response`}
          className="input mt-1.5 resize-y leading-relaxed"
          rows={5}
          value={responseText}
          placeholder="Paste the AI response here…"
          onChange={(e) => setResponseText(e.target.value)}
        />

        <div className="mt-4 rounded-2xl border-2 border-dashed border-teal-100 bg-teal-50/35 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-extrabold text-teal-800">Screenshot evidence</p>
              <p className="mt-0.5 text-xs font-semibold text-ink/45">PNG, JPG, or WebP. The image is compressed before upload.</p>
            </div>
            <label className="btn-ghost btn-sm cursor-pointer no-print">
              {imageBusy ? 'Preparing…' : imageFile ? 'Replace image' : 'Upload screenshot'}
              <input
                type="file"
                className="sr-only"
                accept="image/png,image/jpeg,image/webp"
                disabled={imageBusy || saving}
                onChange={(e) => {
                  void chooseImage(e.target.files?.[0] ?? null);
                  e.currentTarget.value = '';
                }}
              />
            </label>
          </div>

          {previewUrl && (
            <div className="mt-3 overflow-hidden rounded-2xl border border-teal-100 bg-white p-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="AI response screenshot preview" className="max-h-72 w-full rounded-xl object-contain" />
              <div className="mt-2 flex items-center justify-between gap-3 px-1 pb-1">
                <span className="truncate text-xs font-semibold text-ink/50">{imageFile?.name}</span>
                <button type="button" className="text-xs font-extrabold text-coral-600" onClick={clearImage}>
                  Remove
                </button>
              </div>
            </div>
          )}
        </div>

        {message && (
          <p
            className={`mt-3 rounded-2xl px-3.5 py-2.5 text-xs font-bold leading-relaxed ${
              message.tone === 'ok' ? 'bg-teal-50 text-teal-700' : 'bg-coral-50 text-coral-700'
            }`}
          >
            {message.text}
          </p>
        )}

        <div className="mt-4 flex flex-wrap gap-2 no-print">
          <button type="button" className="btn-primary btn-sm" disabled={saving || imageBusy} onClick={saveEvidence}>
            {saving ? 'Saving evidence…' : 'Save AI evidence'}
          </button>
          <button type="button" className="btn-ghost btn-sm" disabled={saving} onClick={startAnotherPrompt}>
            + Add another prompt
          </button>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow text-plum-400">Saved evidence</p>
          {loadingHistory && <span className="text-[11px] font-bold text-ink/35">Loading…</span>}
        </div>

        {!loadingHistory && saved.length === 0 && (
          <p className="mt-2 text-xs font-semibold text-ink/45">No AI evidence has been saved for this prompt yet.</p>
        )}

        {saved.length > 0 && (
          <div className="mt-2.5 space-y-2.5">
            {saved.map((item, index) => (
              <div key={item.id} className="rounded-2xl border border-plum-100 bg-white/85 p-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="chip bg-plum-50 text-plum-500">Evidence {index + 1}</span>
                  <span className="text-[11px] font-bold text-ink/35">
                    {new Date(item.created_at).toLocaleString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p className="mt-2 text-xs font-extrabold text-teal-700">{item.parsed?.provider ?? 'AI'}</p>
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-ink/70">{item.prompt}</p>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-bold text-ink/45">
                  {item.parsed?.text && <span className="chip bg-teal-50 text-teal-700">Text response saved</span>}
                  {item.parsed?.imagePath && <span className="chip bg-sun-100 text-sun-700">Screenshot saved</span>}
                </div>
                {item.imageUrl && (
                  <a href={item.imageUrl} target="_blank" rel="noreferrer" data-lab-allow-exit="true" className="mt-2 block no-print">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={`Saved AI evidence ${index + 1}`}
                      className="max-h-48 w-full rounded-xl border border-teal-50 bg-white object-contain"
                    />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="mt-3 text-[11px] font-semibold leading-relaxed text-ink/45">
        Your moderator can review the prompts and evidence you save here. The Reading Lab does not send these prompts to an AI API.
      </p>
    </div>
  );
}
