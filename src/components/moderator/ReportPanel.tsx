'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { SparkIcon } from '@/components/ui/Icons';
import { MoaPattern } from '@/components/brand/Moa';
import type { AiReportRow } from '@/types/database';

export function ReportPanel({
  participantId,
  participantName,
  report,
}: {
  participantId: string;
  participantName: string;
  report: AiReportRow | null;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: participantId }),
      });

      // Si el servidor devolviera HTML (timeout de la plataforma, 502 del proxy...)
      // json() explotaria: lo leemos como texto y damos un mensaje util.
      const text = await res.text();
      let json: any = null;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          res.ok
            ? 'The server returned an unexpected response. Please try again.'
            : `Server error ${res.status}. Check the deployment logs.`,
        );
      }

      if (!res.ok) throw new Error(json?.error ?? 'The report could not be generated.');
      startTransition(() => router.refresh());
    } catch (e: any) {
      setError(e?.message ?? 'Connection error.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="relative flex flex-wrap items-center justify-between gap-3 bg-teal-700 px-6 py-5 text-white">
        <MoaPattern variant="soft" />
        <div className="relative">
          <p className="eyebrow text-sun-400">AI pedagogical evaluation</p>
          <h2 className="h-display mt-1 text-xl">Report for {participantName.split(' ')[0]}</h2>
        </div>
        <button className="btn-accent relative shadow-pop" onClick={generate} disabled={loading}>
          <SparkIcon className="h-4 w-4" />
          {loading ? 'Analyzing workbook…' : report ? 'Regenerate report' : 'Generate report'}
        </button>
      </div>

      <div className="px-6 py-6">
        {error && (
          <div
            role="alert"
            className="mb-5 rounded-2xl border-2 border-coral-200 bg-coral-50 px-4 py-3 text-sm text-coral-700"
          >
            <p className="font-extrabold">The report could not be generated</p>
            <p className="mt-1 font-semibold">{error}</p>
          </div>
        )}

        {loading && !report && (
          <div className="space-y-3">
            <div className="skeleton h-20 w-full" />
            <div className="skeleton h-32 w-full" />
          </div>
        )}

        {!report && !loading ? (
          <p className="text-sm leading-relaxed text-ink/60">
            There is no report yet. Generate it after the participant completes Day 4: the AI will read
            the responses from all four days and evaluate evidence use, pedagogical depth, and
            reflection quality.
          </p>
        ) : report ? (
          <div className="space-y-7">
            <div className="grid gap-3 sm:grid-cols-3">
              <Score label="Evidence use" value={report.evidence_use} />
              <Score label="Pedagogical depth" value={report.pedagogical_depth} />
              <Score label="Reflection quality" value={report.reflection_depth} />
            </div>

            <div>
              <h3 className="eyebrow text-teal-600">Professional profile</h3>
              <p className="mt-2 text-sm leading-relaxed text-ink/85">{report.summary}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="eyebrow text-moss-600">Strengths</h3>
                <ul className="mt-2.5 space-y-3">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="rounded-2xl border-l-4 border-moss-500 bg-moss-50 p-3.5">
                      <p className="text-sm font-extrabold text-teal-900">{s.title}</p>
                      <p className="mt-1 text-xs italic leading-relaxed text-ink/70">{s.evidence}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="eyebrow text-coral-600">Growth areas</h3>
                <ul className="mt-2.5 space-y-3">
                  {report.growth_areas?.map((g, i) => (
                    <li key={i} className="rounded-2xl border-l-4 border-coral-400 bg-coral-50 p-3.5">
                      <p className="text-sm font-extrabold text-teal-900">{g.title}</p>
                      <p className="mt-1 text-xs italic leading-relaxed text-ink/70">{g.evidence}</p>
                      {g.suggestion && (
                        <p className="mt-2 text-xs font-bold text-teal-700">→ {g.suggestion}</p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-3xl bg-sun-100 p-5">
              <p className="eyebrow text-sun-700">Priority next step</p>
              <p className="mt-1.5 font-bold text-plum-500">{report.next_step}</p>
              {report.moderator_notes && (
                <p className="mt-3 text-xs font-semibold leading-relaxed text-ink/65">
                  For the moderator: {report.moderator_notes}
                </p>
              )}
            </div>

            <p className="text-[11px] font-semibold text-ink/40">
              Generated on {new Date(report.generated_at).toLocaleString('en-US')} · model {report.model} ·
              This report supports moderator judgment; it is not a final grade.
            </p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="rounded-2xl border-2 border-teal-50 p-3.5">
      <p className="text-xs font-bold text-ink/55">{label}</p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="flex grow gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <span
              key={n}
              className={`h-2 w-full rounded-full transition ${
                n <= v ? (v >= 4 ? 'bg-moss-500' : v >= 3 ? 'bg-teal-500' : 'bg-sun-400') : 'bg-teal-100'
              }`}
            />
          ))}
        </span>
        <span className="h-display shrink-0 text-sm text-teal-700">{v}/5</span>
      </div>
    </div>
  );
}
