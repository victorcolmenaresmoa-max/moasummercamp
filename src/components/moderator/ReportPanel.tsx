'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

  async function generate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: participantId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Error');
      router.refresh();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 bg-brand-900 px-6 py-4 text-white">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-accent-400">Evaluación pedagógica IA</p>
          <h2 className="font-serif text-xl font-bold">Reporte de {participantName.split(' ')[0]}</h2>
        </div>
        <button className="btn-accent" onClick={generate} disabled={loading}>
          {loading ? 'Analizando el workbook…' : report ? 'Regenerar reporte' : 'Generar reporte'}
        </button>
      </div>

      <div className="px-6 py-5">
        {error && <p className="mb-4 rounded-xl bg-clay-100 px-3 py-2 text-sm text-clay-500">{error}</p>}

        {!report ? (
          <p className="text-sm text-ink/60">
            Aún no hay reporte. Genéralo cuando el docente haya completado el Día 4: la IA leerá las respuestas
            de los cuatro días y evaluará su uso de evidencia, profundidad pedagógica y calidad de la reflexión.
          </p>
        ) : (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-3">
              <Score label="Uso de evidencia" value={report.evidence_use} />
              <Score label="Profundidad pedagógica" value={report.pedagogical_depth} />
              <Score label="Calidad de la reflexión" value={report.reflection_depth} />
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-brand-700">Retrato profesional</h3>
              <p className="mt-1 text-sm leading-relaxed text-ink/85">{report.summary}</p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-moss-500">Fortalezas</h3>
                <ul className="mt-2 space-y-3">
                  {report.strengths?.map((s, i) => (
                    <li key={i} className="rounded-xl bg-moss-100/60 p-3">
                      <p className="text-sm font-bold text-brand-900">{s.title}</p>
                      <p className="mt-1 text-xs italic text-ink/70">{s.evidence}</p>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wide text-clay-500">Áreas de mejora</h3>
                <ul className="mt-2 space-y-3">
                  {report.growth_areas?.map((g, i) => (
                    <li key={i} className="rounded-xl bg-clay-100/60 p-3">
                      <p className="text-sm font-bold text-brand-900">{g.title}</p>
                      <p className="mt-1 text-xs italic text-ink/70">{g.evidence}</p>
                      <p className="mt-2 text-xs font-semibold text-brand-700">→ {g.suggestion}</p>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rounded-xl border border-accent-400/40 bg-accent-400/10 p-4">
              <p className="text-xs font-bold uppercase tracking-wide text-accent-600">Siguiente paso prioritario</p>
              <p className="mt-1 text-sm font-semibold text-ink/85">{report.next_step}</p>
              {report.moderator_notes && (
                <p className="mt-2 text-xs text-ink/70">Para el moderador: {report.moderator_notes}</p>
              )}
            </div>

            <p className="text-[11px] text-ink/45">
              Generado el {new Date(report.generated_at).toLocaleString('es-VE')} · modelo {report.model} ·
              Este reporte es un apoyo al criterio del moderador, no una calificación final.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}

function Score({ label, value }: { label: string; value: number | null }) {
  const v = value ?? 0;
  return (
    <div className="rounded-xl border border-brand-100 p-3">
      <p className="text-xs font-semibold text-ink/60">{label}</p>
      <div className="mt-2 flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className={`h-2 w-full rounded-full ${n <= v ? 'bg-brand-500' : 'bg-brand-100'}`} />
        ))}
        <span className="ml-2 text-sm font-bold text-brand-700">{v}/5</span>
      </div>
    </div>
  );
}
